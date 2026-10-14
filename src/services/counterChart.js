export function counterExportBounds({x=0,y=0,width,height},padding=32) {
  return {x:x-padding,y:y-padding,width:width+padding*2,height:height+padding*2};
}

export function counterDataCoverage(series) {
  const years=[...new Set(series.filter(point=>Number.isFinite(point.year) && Number.isFinite(point.amount) && point.amount>=0).map(point=>point.year))].sort((a,b)=>a-b);
  const ranges=[],gaps=[];
  for(const year of years){
    const range=ranges.at(-1);
    if(range && year===range.last+1)range.last=year;
    else{
      if(range)gaps.push({first:range.last+1,last:year-1});
      ranges.push({first:year,last:year});
    }
  }
  return {ranges,gaps};
}

export function counterChartGeometry(series,{width=320,height=204}={}) {
  const values=series.filter(item=>Number.isFinite(item.year) && Number.isFinite(item.amount) && item.amount>=0).sort((a,b)=>a.year-b.year);
  if(!values.length)return null;
  const first=values[0].year,last=values.at(-1).year,max=Math.max(...values.map(item=>item.amount),1);
  const magnitude=10**Math.floor(Math.log10(max));
  const ceiling=[1,2,5,10].find(value=>value*magnitude>=max)*magnitude;
  const right=width-14,bottom=height-30,plotWidth=right-58,plotHeight=bottom-18;
  const points=values.map(item=>({...item,x:first===last?58+plotWidth/2:58+(item.year-first)/(last-first)*plotWidth,y:bottom-item.amount/ceiling*plotHeight}));
  const segments=[];
  for(const point of points){
    if(!segments.length || point.year!==segments.at(-1).at(-1).year+1)segments.push([]);
    segments.at(-1).push(point);
  }
  const gaps=counterDataCoverage(values).gaps.map(gap=>({...gap,x:58+(gap.first-first-0.5)/(last-first)*plotWidth,width:(gap.last-gap.first+1)/(last-first)*plotWidth}));
  return {points,segments,gaps,ceiling,right,bottom,plotWidth,plotHeight,years:[...new Set(Array.from({length:5},(_,index)=>Math.round(first+(last-first)*index/4)))]};
}

export function counterExportLabels(series,{width=760,height=310}={}) {
  const geometry=counterChartGeometry(series,{width,height});
  if(!geometry)return [];
  const placed=[];
  return geometry.points.map((point,index)=>{
    const text=point.value ?? String(point.amount),labelWidth=text.length*6;
    const offsets=index%2?[17,-10,31,-24,45,-38,-52]:[-10,17,-24,31,-38,45,-52];
    let box;
    for(const offset of offsets){
      const y=Math.max(-16,Math.min(geometry.bottom-8,point.y+offset));
      const candidate={left:point.x-labelWidth/2,right:point.x+labelWidth/2,top:y-10,bottom:y+3};
      if(!placed.some(other=>candidate.left<other.right && candidate.right>other.left && candidate.top<other.bottom && candidate.bottom>other.top)){
        box=candidate;break;
      }
    }
    box ??= {left:point.x-labelWidth/2,right:point.x+labelWidth/2,top:point.y-62,bottom:point.y-49};
    placed.push(box);
    return {x:point.x,y:box.bottom-3,text,year:point.year,box,latest:index===geometry.points.length-1};
  });
}

export function createCounterChart(model,doc,{width=320,height=204,dataLabels=false}={}) {
  const geometry=counterChartGeometry(model.chartSeries,{width,height});
  if(!geometry)return null;
  const figure=doc.createElement("figure");figure.className="traffic-popup-chart";
  const heading=doc.createElement("figcaption");heading.textContent=model.chartLabel;figure.append(heading);
  const svg=(tag,attributes,text)=>{
    const element=doc.createElementNS("http://www.w3.org/2000/svg",tag);
    for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
    if(text!==undefined)element.textContent=text;
    return element;
  };
  const chart=svg("svg",{viewBox:`0 0 ${width} ${height}`,role:"group","aria-label":model.chartLabel});
  for(const gap of geometry.gaps){
    const band=svg("rect",{x:gap.x,y:18,width:gap.width,height:geometry.plotHeight,class:"counter-chart-gap","aria-label":`${model.missingYearsLabel}: ${gap.first===gap.last?gap.first:`${gap.first}-${gap.last}`}`});
    band.append(svg("title",{},`${model.missingYearsLabel}: ${gap.first===gap.last?gap.first:`${gap.first}-${gap.last}`}`));chart.append(band);
    const center=gap.x+gap.width/2;
    chart.append(svg("path",{d:`M${center-6} ${geometry.bottom-4}l4 8 4-8 4 8`,class:"counter-chart-break"}));
  }
  for(let index=0;index<=4;index++){
    const amount=geometry.ceiling*index/4,y=geometry.bottom-index*geometry.plotHeight/4;
    chart.append(svg("line",{x1:58,x2:geometry.right,y1:y,y2:y,class:"counter-chart-grid"}));
    chart.append(svg("text",{x:52,y:y+4,"text-anchor":"end",class:"counter-chart-axis"},model.chartNumber(amount)));
  }
  const first=geometry.points[0].year,last=geometry.points.at(-1).year;
  for(const year of geometry.years){
    const x=first===last?58+geometry.plotWidth/2:58+(year-first)/(last-first)*geometry.plotWidth;
    chart.append(svg("text",{x,y:height-10,"text-anchor":"middle",class:"counter-chart-axis"},String(year)));
  }
  for(const segment of geometry.segments)if(segment.length>1)chart.append(svg("polyline",{points:segment.map(point=>`${point.x},${point.y}`).join(" "),class:"counter-chart-line"}));
  const tooltip=doc.createElement("div");tooltip.className="counter-chart-tooltip";tooltip.hidden=true;tooltip.setAttribute("role","tooltip");
  const describe=point=>`${point.year}: ${point.value} ${model.historyUnit}`;
  const indicator=svg("line",{y1:18,y2:geometry.bottom,class:"counter-chart-indicator",visibility:"hidden"});chart.append(indicator);
  const show=point=>{
    tooltip.hidden=false;tooltip.textContent=describe(point);
    const box=chart.getBoundingClientRect(),parent=figure.getBoundingClientRect();
    tooltip.style.left=`${Math.max(70,Math.min(parent.width-70,box.left-parent.left+point.x/width*box.width))}px`;
    tooltip.style.top=`${box.top-parent.top+point.y/height*box.height-12}px`;
    indicator.setAttribute("x1",point.x);indicator.setAttribute("x2",point.x);indicator.setAttribute("visibility","visible");
  };
  const hide=()=>{tooltip.hidden=true;indicator.setAttribute("visibility","hidden");};
  const circles=geometry.points.map((point,index)=>{
    const circle=svg("circle",{cx:point.x,cy:point.y,r:3.5,tabindex:0,role:"img","aria-label":describe(point),class:`counter-chart-point${index===geometry.points.length-1?" is-latest":""}`});
    circle.addEventListener("focus",()=>show(point));circle.addEventListener("blur",hide);
    circle.addEventListener("keydown",event=>{
      const delta=event.key==="ArrowRight"?1:event.key==="ArrowLeft"?-1:0;
      if(delta){event.preventDefault();circles[(index+delta+circles.length)%circles.length].focus();}
    });
    return circle;
  });
  const selectNearest=event=>{
    const box=chart.getBoundingClientRect(),x=(event.clientX-box.left)/box.width*width;
    if(x<58 || x>geometry.right){hide();return;}
    const point=geometry.points.reduce((nearest,point)=>Math.abs(point.x-x)<Math.abs(nearest.x-x)?point:nearest);
    show(point);
  };
  chart.addEventListener("pointermove",selectNearest);chart.addEventListener("pointerdown",selectNearest);chart.addEventListener("pointerleave",hide);
  chart.append(...circles);
  if(dataLabels){
    counterExportLabels(model.chartSeries,{width,height}).forEach((label,index)=>{
      chart.append(svg("text",{x:label.x,y:label.y,"text-anchor":"middle","font-family":"Arial,sans-serif","font-size":9,"font-weight":500,fill:label.latest?"#b43d39":"#4c4c4e",stroke:"white","stroke-width":2.5,"stroke-linejoin":"round","paint-order":"stroke",class:"counter-export-label"},label.text));
      circles[index].append(svg("title",{},`${label.year}: ${label.text} ${model.historyUnit}`));
    });
  }
  figure.append(chart,tooltip);
  return figure;
}
