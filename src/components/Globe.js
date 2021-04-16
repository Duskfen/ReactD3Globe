import React, { Component } from 'react'
import * as d3 from 'd3'
import GeoData from "./geoJson/rough.geo.json"
import versor from "versor" //versor is used for rotating the globe 

//maybe change to configurable variable if needed
const animationSpeed = 6000;

// if you wonder why I render the world in canvas and the datapoints in svg:
// -> It's because of the animations. I don't know how to animate in canvas.. 
// -> so I use svg with Element.animate() javascript function which lets me use
//    css animations (-> good performance)

export default class Globe extends Component {
   constructor(props) {
      super(props);

      this.dimensionsPerPropsSpecified = this.props.width && this.props.height;

      this.updateProjection = false;
      this.currentProjection = this.props.Projection.function || d3.geoOrthographic()
      if (this.props.Projection) this.currentProjectionName = this.props.Projection.name;
      else this.currentProjectionName = "Orthographic";

      console.log(this.currentProjection)
      console.log(d3.geoOrthographic)

      this.width = this.props.width;
      this.height = this.props.height;

      this.sphere = ({ type: "Sphere" })
      this.projection = null;
      this.svg = null;


   }


   createTranslucentGlobe = () => {
      let canvas = d3.select("#globe")
         .append("canvas")
         .attr("width", this.width)
         .attr('height', this.height)

      let canvasContext = canvas
         .node().getContext("2d");

      canvas = canvas._groups[0][0]

      this.projection = this.currentProjection
         .rotate([0,0])
         //.rotate([-10, -50]) //initial rotate to ~ center Austria (on orthographic earth usefull)
         .precision(0.1)
         .fitSize([this.width, this.height], this.sphere)

      let path = d3.geoPath(this.projection, canvasContext);

      this.projection.scale(200) //initial zoom
      return d3.select(canvasContext.canvas)
         .call(this.zoom(this.projection)
            .on("zoom.render", () => this.renderWorld(GeoData, canvasContext, path, canvas)) //only a rough map while zooming/rotating (speed reasons)
            .on("end.render", () => this.renderWorld(GeoData, canvasContext, path, canvas))) //could specify a more detailed world
         .call(() => this.renderWorld(GeoData, canvasContext, path, canvas)) //could specify a more detailed world
         .node();
   }

   initializeSVG = () => {
      //svg is for the globepoints
      this.svg = d3.select("#globepoints").append("svg")
         .attr("width", this.width)
         .attr('height', this.height);
   }

   renderWorld(world, context, path, canvas) {
      //clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.lineWidth = 0.3;
      context.beginPath();
      path(this.sphere);
      context.fillStyle = "#fff";
      context.fill();
      context.stroke()
      context.strokeStyle = "#E5E5E5";

      if (this.currentProjectionName === "Orthographic") {
         //translucent part (by "fil" -> https://observablehq.com/@d3/projection-reflectx) 
         const r = this.projection.rotate();
         this.projection.reflectX(true).rotate([r[0] + 180, -r[1], -r[2]]);
         context.beginPath();
         path(world);
         context.fillStyle = "rgba(0,0,0,0.1)";
         context.fill();
         this.projection.reflectX(false).rotate(r);
      }


      var graticule = d3.geoGraticule10()

      context.beginPath();
      path(graticule);
      context.strokeStyle = "#ccc";
      context.stroke();

      //countries, stroke are the white gaps between them
      context.beginPath();
      path(world);
      context.fillStyle = "rgba(0,0,0,1)";
      context.fill();
      context.stroke()
      context.strokeStyle = "white";

      // if you want to render the datapoints via canvas
      // context.beginPath(); //elements are now rendered with svg, to support better animations;
      // path.pointRadius([3])
      // path({type: "MultiPoint", coordinates:points});
      // context.fillStyle="tomato"
      // context.fill();

      this.updatePointsOnGlobe();
   }

   updatePointsOnGlobe = () => {

      //select all existing circles and update their coordinates
      //if they are not visible on the earth (on the backside), change their opacity to 0

      let circles = this.svg.selectAll("circle");
      circles
         .attr("cx", (point) => this.projection(point)[0])
         .attr("cy", (point) => this.projection(point)[1])
         .attr("opacity", (point) => {
            if (this.isPointVisible(this.projection)(point)) return 1
            else return 0;
         });
   }

   renderNewPointOnGlobe = (point) => {

      let circle = this.svg.append("circle")
         .data([point])
         .attr("class", "globepoint")
         .attr('r', 2)
         .attr("cx", (point) => this.projection(point)[0])
         .attr("cy", (point) => this.projection(point)[1])
         .attr("data", point).node()

      let anim = circle.animate([
         { r: "0px" },
         { r: "10px" },
         { r: "0px" },
      ], { duration: animationSpeed, easing: "ease-in-out" })

      //Attention, if you wan't to remove points manually (after a specific time, uncomment following line)
      anim.onfinish = () => circle.remove();
   }

   // -------------------------- temporary (remove if real datapoints are implemented) --------------------------
   //min and max are included
   randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
   createRandomPoint() {
      //longitude -180 to 180
      //latitude 0 to 90
      return [this.randomIntFromInterval(-180, 180), this.randomIntFromInterval(0, 90)]

   }
   randomPointSpawning = () => {
      this.renderNewPointOnGlobe(this.createRandomPoint());
      setTimeout(this.randomPointSpawning, this.randomIntFromInterval(10, 90))
   }
   // -------------------------- end temporary ------------------------------------------------------------------

   isPointVisible(projection) {
      let visible;
      const stream = projection.stream({ point() { visible = true; } });

      //visible is set to false;
      // if a point is outside the stream, don't set visible to true, 
      // else set visible to true, return visible
      return ([x, y]) => (visible = false, stream.point(x, y), visible);
   }

   // zoom by "Fil" -> https://observablehq.com/d/1ea380bf05fbf68c@322
   zoom(projection, {
      // Capture the projection’s original scale, before any zooming.
      scale = projection._scale === undefined
         ? (projection._scale = projection.scale())
         : projection._scale,
      scaleExtent = [0.04, 20]
   } = {}) {
      let v0, q0, r0, a0, tl;

      const zoom = d3.zoom()
         .scaleExtent(scaleExtent.map(x => x * scale))
         .on("start", zoomstarted)
         .on("zoom", zoomed);

      function point(event, that) {
         const t = d3.pointers(event, that);

         if (t.length !== tl) {
            tl = t.length;
            if (tl > 1) a0 = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
            zoomstarted.call(that, event);
         }

         return tl > 1
            ? [
               d3.mean(t, p => p[0]),
               d3.mean(t, p => p[1]),
               Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0])
            ]
            : t[0];
      }

      function zoomstarted(event) {
         if (!event) return;
         v0 = versor.cartesian(projection.invert(point(event, this)));
         q0 = versor((r0 = projection.rotate()));
      }

      function zoomed(event) {
         projection.scale(event.transform.k);
         const pt = point(event, this);
         const v1 = versor.cartesian(projection.rotate(r0).invert(pt));
         const delta = versor.delta(v0, v1);
         let q1 = versor.multiply(q0, delta);

         // For multitouch, compose with a rotation around the axis.
         if (pt[2]) {
            const d = (pt[2] - a0) / 2;
            const s = -Math.sin(d);
            const c = Math.sign(Math.cos(d));
            q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
         }

         projection.rotate(versor.rotation(q1));

         // In vicinity of the antipode (unstable) of q0, restart.
         if (delta[0] < 0.7) zoomstarted.call(this);
      }

      return Object.assign(selection => selection
         .property("__zoom", d3.zoomIdentity.scale(projection.scale()))
         .call(zoom), {
         on(type, ...options) {
            return options.length
               ? (zoom.on(type, ...options), this)
               : zoom.on(type);
         }
      });
   }

   render() {
      return (
         <>
            <div id="globe">
            </div>
            <div id="globepoints">
            </div>
         </>
      )
   }

   componentDidMount() {
      let globe = document.querySelector("#globe")

      if (!this.dimensionsPerPropsSpecified) {
         this.width = globe.clientWidth; //set width to globe width (currently 100vw 100vh)
         this.height = globe.clientHeight; //note: the globe width also applies to the globepoints
      }

      this.initializeSVG();
      this.createTranslucentGlobe();

      this.randomPointSpawning(); //TODO work with real data and not random points
      //API polling? or Sockets? (sockets are a bit of a overhead i guess but idk..)

      window.addEventListener("resize", this.windowResizeEventHandler);
   }

   getSnapshotBeforeUpdate(prevProps){
      if(prevProps.Projection !== this.props.Projection){
         this.updateProjection = true;
      }
      return null;
   }
   componentDidUpdate(){
      if(this.updateProjection){
         this.updateProjection = false;
         this.currentProjection = this.props.Projection.function;
         this.currentProjectionName = this.props.Projection.name;
         document.querySelector("#globe canvas").remove();
         this.createTranslucentGlobe();
      }
   }

   windowResizeEventHandler = () => {
      //if resized, update the dimensions of the canvas and svg (all points get removed :( ))
      // future: maybe just update the width and height properties so you don't have to rerender and the points doesn't get deleted
      let globe = document.querySelector("#globe")
      let svg = document.querySelector("#globepoints svg")

      if (!this.dimensionsPerPropsSpecified) {
         this.width = globe.clientWidth;
         this.height = globe.clientHeight;
      }

      svg.remove()
      console.log(globe)
      globe.childNodes[0].remove(); //remove canvas
      this.createTranslucentGlobe();
      this.initializeSVG();
   }
}
