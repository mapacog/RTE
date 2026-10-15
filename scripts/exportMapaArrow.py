"""Export the original PDF-compatible Illustrator paths as a web background."""
import argparse
from pathlib import Path
from xml.etree import ElementTree as ET

from pypdf import PdfReader
from pypdf.generic import ContentStream


def export_arrow(source, target):
    page = PdfReader(source).pages[0]
    svg = ET.Element("svg", {"xmlns": "http://www.w3.org/2000/svg", "viewBox": "0 600 3300 1200", "width": "3300", "height": "1200"})
    ET.SubElement(svg, "title").text = "MAPA arrow swoop"
    ET.SubElement(svg, "desc").text = "Original MAPA_ArrowSwoop.ai vector artwork with empty artboard margins trimmed."
    group = ET.SubElement(svg, "g", {"transform": "translate(0 1800) scale(1 -1)"})
    stack, path = [], []
    color, x, y = None, 0, 0
    for arguments, operator in ContentStream(page.get_contents(), page.pdf).operations:
        values = [float(value) for value in arguments] if operator in (b"cm", b"rg", b"m", b"l", b"c") else []
        if operator == b"q":
            stack.append((color, x, y))
        elif operator == b"Q":
            color, x, y = stack.pop()
        elif operator == b"cm":
            if values[:4] != [1, 0, 0, 1]:
                raise ValueError("Unexpected source artwork transform")
            x += values[4]
            y += values[5]
        elif operator == b"rg":
            color = "#" + "".join(f"{round(value * 255):02x}" for value in values)
        elif operator in (b"m", b"l", b"c"):
            path.append(operator.decode().upper() + " ".join(f"{value:.12g}" for value in values))
        elif operator == b"f":
            ET.SubElement(group, "path", {"fill": color, "transform": f"translate({x:.12g} {y:.12g})", "d": " ".join(path) + " Z"})
            path = []
        elif operator == b"n":
            path = []
        elif operator == b"gs":
            state = page["/Resources"]["/ExtGState"][arguments[0]]
            if state.get("/ca", 1) != 1 or state.get("/BM", "/Normal") != "/Normal":
                raise ValueError("Unexpected source artwork transparency")
        elif operator not in (b"BDC", b"EMC", b"re", b"W"):
            raise ValueError(f"Unexpected drawing operator: {operator!r}")
    if len(group.findall("path")) != 7 or stack:
        raise ValueError("Expected seven original arrow shapes")
    target.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(svg).write(target, encoding="unicode")
    print(f"Exported seven original paths: {target} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    options = parser.parse_args()
    export_arrow(options.source, options.target)
