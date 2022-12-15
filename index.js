
let limit = 500; //Specifies max co-ordinates. Starts at (0,0) Default is (500,500)
let baseColor="black";
let margin = {top: 50, right: 0, bottom: 30, left: 50},
	width = 750 - margin.left - margin.right,
	height = 750 - margin.top - margin.bottom;

// set the ranges
var xScale = d3.scaleLinear().range([0, width]);
var yScale = d3.scaleLinear().range([height, 0]);
xScale.domain([-1.5*limit+limit/5, 2*limit+limit/5]);
yScale.domain([-1.5*limit+limit/5, 2*limit+limit/5]);
//yScale.domain([-0.5*limit, 1.5*limit]);

// Get the data
let pointData;

// format the data
let edges = {};
let triangulatedEdges = [];
let svg,points,delaunay,queryPoint,triangleCount;
let triangles = [];
let triangleID=1;
let noOfPoints = 0;

function initJS(){
	svg = initSVG();
}

function initSVG(){
	return d3.select("div#container").append("svg").attr("id","graphics")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform",
			"translate(" + margin.left + "," + margin.top + ")");
}

function getGraphData(size){
	var dataset = []
	//Change i to increase no. of vertices generated.
	for (var i = 0; i < size; i++) {
		var x = d3.randomInt(0,limit)();
		var y = d3.randomInt(0,limit)();
		dataset.push({"x": x, "y": y, });
	}
	return dataset
}

function insertEdge(value,index,array,edges){
	//console.log(edges);
	if(array.hasOwnProperty(index)){
		if (index !== array.length - 1) {
			//console.log("Index is "+index+" and value is "+value);
			if (value === undefined) {
				return;
			}
			let next = array[index+1];
			if (!edges[value]) {
				edges[value] = {};
			}
			edges[value][next] = 1;
			if (!edges[array[index + 1]]) {
				edges[array[index + 1]] = {};
			}
			//console.log("Inserting edge between " + value + " and " + array[index + 1]);
			edges[next][value] = 1;
		}
	}
}

function randomGraph(){
	var size = $("#vertexCount").val();

	pointData = getGraphData(size);
	points = pointData.map((d) => [d.x, d.y]);
	delaunay = d3.Delaunay.from(points);
	//const voronoi = delaunay.voronoi([0, 0, limit, limit]);

	var hull = delaunay.hullPolygon();
	//Creating polygon by mandatory choosing hull edges
	hull.forEach(function(value,index,array){insertEdge(value,index,array,edges)});

	//To create random polygon by choosing from all triangles
	for(var i=0;i<delaunay.triangles.length;i+=d3.randomInt(1,5)()){
		if(delaunay.trianglePolygon(i)[0][0] === undefined){
			break;
		}
		delaunay.trianglePolygon(i).forEach(function(value,index,array){insertEdge(value,index,array,edges)});
	}
	drawGraph(edges);
	$("#generate").prop("disabled",true);
	$("#triangulate").prop("disabled",false);
	noOfPoints = edges.length;
}

function slab(){
	for(let [point1] of Object.entries(edges)) {
		let x1 = point1.split(",")[0];
		if (edges.hasOwnProperty(point1)) {
			drawLine(x1, 0, x1, limit, "blue");
		}
	}
}

function isAdjacent(point1,point2,edges){
	//Iterate through the edges and check if points are adjacent
	let edgeList = edges[point1];
	edgeList.forEach(function (vertex) {
		if(point2===vertex){
			return true;
		}
	});
	return false;
}

function getDegree(point,edges){
	return edges[point].length;
}

function initTriangulate(){
	document.getElementById("graphics").remove();
	svg = initSVG();
	triangulatedEdges[0] = {};
	var tempSet = [[-2*limit/3,-limit/2],[limit+2*limit/3,-limit/2],[limit/2,2*limit]];
	getPointSet(edges,tempSet);
	triangles[0] = triangulate(edges,triangulatedEdges[0],tempSet);
	drawGraph(triangulatedEdges[0]);
	$("#triangulate").prop("disabled",true);
	$("#preprocess").prop("disabled",false);
}

function triangulate(edges,triangulated,pointSet){
	delaunay = d3.Delaunay.from(pointSet);
	var hull = delaunay.hullPolygon();
	let triangleList = [];
	//Creating polygon by mandatory choosing hull edges
	hull.forEach(function(value,index,array){insertEdge(value,index,array,triangulated)});
	for(let i=0;i<delaunay.triangles.length;i++){
		if(delaunay.trianglePolygon(i)[0][0] === undefined){
			break;
		}
		triangleList.push({"id":triangleID++,"triangle":delaunay.trianglePolygon(i),"intersect":[]});
		delaunay.trianglePolygon(i).forEach(function(value,index,array){
			insertEdge(value,index,array,triangulated)
		});
	}
	return triangleList;
}

function locatePoint(count){
	if(count===undefined){
		count=triangles.length-1;
	}
	if(count===0){
		let currentTriangles = triangles[count];
		currentTriangles.forEach(function(triangle){
			if(d3.polygonContains(triangle["triangle"],queryPoint)){
				//console.log("Present in triangle"+triangle["id"]);
				drawPolygon(triangle["triangle"],"green");
			}
		});
		return;
	}
	drawPoint(queryPoint[0],queryPoint[1],"red");
	console.log("Iteration "+count+" - Triangle");
	console.log(triangles);
	let currentTriangles = triangles[count];
	currentTriangles.forEach(function(triangle){
		if(d3.polygonContains(triangle["triangle"],queryPoint)){
			//console.log("Present in triangle"+triangle["id"]);
			//console.log("Intersects with -> "+triangle["intersects"]);
			if(triangle["intersect"]){
				console.log(triangle["intersect"]);
				drawPolygon(triangle["triangle"]);
				return locatePoint(--count);
				//
			}
		}
	});
	//drawGraph(triangulatedEdges[0]);


}

function getPointSet(edges,pointSet){
	for(let [point] of Object.entries(edges)) {
		if (edges.hasOwnProperty(point)) {
			pointSet.push([point.split(",")[0], point.split(",")[1]]);
		}
	}
	return pointSet;
}
function startProcess(){
	$("#statusLabel").text("Processing");
	preprocess();
}

async function preprocess() {
	await sleep(10);
	let chosen = [];
	let discard = [];
	let degrees = [];
	let i = 1;
	while (triangulatedEdges[i]) {
		i++;
	}
	let currentGraph = triangulatedEdges[i - 1];
	for (let [point1] of Object.entries(currentGraph)) {
		if (currentGraph.hasOwnProperty(point1)) {
			if (isPointInBound(point1)) {
				let degree = getDegree(point1, currentGraph);
				degrees.push([point1, degree]);
			}
		}
	}
	degrees.sort(function (a, b) {
		return b[1] - a[1];
	});

	degrees.forEach(function (value) {
		let point = value[0];
		if (discard.includes(point)) {
			return;
		}
		chosen.push(point);
		for (let [vertex] of Object.entries(currentGraph[point])) {
			discard.push(vertex)
		}
	});
	chosen.forEach(function (iter) {
		drawPoint(iter.split(",")[0], iter.split(",")[1], "green");
	});
	let temp = $.extend(true, {}, currentGraph);
	removeEdges(chosen, temp);
	triangulatedEdges[i] = temp;
	document.getElementById("graphics").remove();
	svg = initSVG();
	//drawGraph(triangulatedEdges[i]);
	let remainingPoints = getPointSet(triangulatedEdges[i], []);
	triangles[i] = triangulate(triangulatedEdges[i], triangulatedEdges[i], remainingPoints);

	for (let [i1,triangle1] of Object.entries(triangles[i])) {
		for (let [i2,triangle2] of Object.entries(triangles[i-1])) {
			//console.log(triangle1);
			//console.log(triangle2);
			if(trianglesIntersect(triangle1["triangle"],triangle2["triangle"])){
				//console.log("Triangle intersect");
				triangle1["intersect"].push(triangle2["id"]);
			}
		}
	}

	drawGraph(triangulatedEdges[i]);
	if (remainingPoints.length === 3) {
		triangleCount = i;
		$("#placePoint").prop("disabled",false);
		$("#preprocess").prop("disabled",true);
		return;
	}
	$("#statusLabel").text("Done");
	//preprocess();
}
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function removeEdges(toRemove,graph){
	toRemove.forEach(function(vertex){
		delete graph[vertex];
	});
	for(let [point,edgeList] of Object.entries(graph)) {
		toRemove.forEach(function(vertex){
			delete edgeList[vertex];
			if(edgeList.length===0){
				delete graph[point];
			}
		});
	}

}

function isPointInBound(point){
	let x =point.split(",")[0];
	let y =point.split(",")[1];
	return !(x > 500 || y > 500 || x < 0 || y < 0);

}

function placePoint(){
	var x = d3.randomInt(limit/4,limit*3/4)();
	var y = d3.randomInt(limit/4,limit*3/4)();
	queryPoint = [x,y];
	drawPoint(x,y,"red");
	$("#locatePoint").prop("disabled",false);
}

var trianglesIntersect = function(tri1, tri2) {
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			var a = tri1[i];
			var b = tri1[i+1];
			var c = tri2[j];
			var d = tri2[j+1];
			if (sidesIntersect(a, b, c, d)) return true;
			if (triangleContainsPoint(tri1[i], tri2) || triangleContainsPoint(tri2[j], tri1))
				return true;
		}
	}
	return false;
};

function triangleContainsPoint(p, tri) {
	return d3.polygonContains(tri,p);
}

function sidesIntersect(a, b, c, d) {
	var int1 = (ccw(a, b, c) > 0) ? (ccw(a, b, d) < 0) : (ccw(a, b, d) > 0);
	var int2 = (ccw(c, d, a) > 0) ? (ccw(c, d, b) < 0) : (ccw(c, d, b) > 0);

	return int1 && int2;
}

function ccw(a, b, c) {
	return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
}

//For drawing slabs
/*for(let [point1] of Object.entries(edges)) {
	let x1 = point1.split(",")[0];
	if(edges.hasOwnProperty(point1)) {
		drawLine(x1,0,x1,limit,"blue");
	}
}*/

function drawGraph(edges){
	for(let [point1, edgeList] of Object.entries(edges)) {
		if(edges.hasOwnProperty(point1)) {
			let x1 = point1.split(",")[0];
			let y1 = point1.split(",")[1];
			drawPoint(x1,y1);
			for(let [point2] of Object.entries(edgeList)) {
				if (edgeList.hasOwnProperty(point2)) {
					let x2 = point2.split(",")[0];
					let y2 = point2.split(",")[1];
					if (y2 === undefined) {
						let temp = x2;
						x2 = temp[0];
						y2 = temp[1];
					}
					drawLine(x1, y1, x2, y2);
				}
			}
		}
	}
	//Add X axis
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(xScale));
	// add the Y Axis
	svg.append("g")
		.call(d3.axisLeft(yScale));
}

function drawLine(x1,y1,x2,y2,color=baseColor){
	//console.log("Drawing line between ("+x1+","+y1+") and ("+x2+","+y2+")");
	svg.append("line")
		.attr("fill","none")
		.attr("stroke",color)
		.attr("stroke-width",1)
		.attr("x1",xScale(x1))
		.attr("y1",yScale(y1))
		.attr("x2",xScale(x2))
		.attr("y2",yScale(y2));
}

function drawPoint(x,y,color=baseColor){
	//console.log("Drawing point at"+x+" "+y+" .");
	svg.append("circle")
		.attr("fill",color)
		.attr("r", 2)
		.attr("cx", xScale(x))
		.attr("cy", yScale(y));
}

function drawPolygon(polygon,color="none"){
	var polyString = "";
	polygon.forEach(function(vertex){
		polyString+=xScale(vertex[0])+","+yScale(vertex[1])+" ";
	});
	console.log(polyString);
	svg.append("polygon")
		.attr("points",polyString)
		.style("fill", color)
		.style("stroke", "black")
		.style("strokeWidth", "10px");
}

// add the X Axis

