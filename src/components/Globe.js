import React, { Component } from 'react'
import * as topojson from "topojson"
import * as d3 from 'd3'
import Topology from "./geoJson/rough.geo.json"
import versor from "versor"

const animationSpeed = 6000

export default class Globe extends Component {
   constructor(props) {
      super(props);

      this.width = this.props.width | 400;
      this.height = this.props.height | 400;

      this.geoJson = topojson.feature(Topology, Topology.objects.ne_110m_admin_0_countries)
      this.sphere = ({ type: "Sphere" })
      this.projection = null;
      this.svg = null;

      this.currentPoints = [];
   }

   createReflectedGlobe = () => {
      let canvas = d3.select("#globe")
         .append("canvas")
         .attr("width", this.width)
         .attr('height', this.height)

      let canvasContext = canvas
         .node().getContext("2d");

      canvas = canvas._groups[0][0]

      this.projection = d3.geoOrthographic()
         .rotate([-10, -50])
         .precision(0.1)
         .fitSize([this.width, this.height], this.sphere)


      let path = d3.geoPath(this.projection, canvasContext);

      this.projection.scale(600)
      return d3.select(canvasContext.canvas)
         .call(this.zoom(this.projection)
            .on("zoom.render", () => this.renderWorld(this.geoJson, canvasContext, path, canvas))
            .on("end.render", () => this.renderWorld(this.geoJson, canvasContext, path, canvas)))
         .call(() => this.renderWorld(this.geoJson, canvasContext, path, canvas))
         .node();
   }

   initializeSVG = () => {
      //svg is for the globepoints
      this.svg = d3.select("#globepoints").append("svg")
         .attr("width", this.width)
         .attr('height', this.height);
   }

   renderWorld(world, context, path, canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.lineWidth = 0.3;
      context.beginPath();
      path(this.sphere);
      context.fillStyle = "#fff";
      context.fill();
      context.stroke()
      context.strokeStyle = "#E5E5E5";

      const r = this.projection.rotate();

      this.projection.reflectX(true).rotate([r[0] + 180, -r[1], -r[2]]);

      context.beginPath();
      path(world);
      context.fillStyle = "rgba(0,0,0,0.1)";
      context.fill();
      this.projection.reflectX(false).rotate(r);

      context.beginPath();
      path(world);
      context.fillStyle = "rgba(0,0,0,1)";
      context.fill();
      context.stroke()
      context.strokeStyle = "white";

      // context.beginPath(); //elements are now rendered with svg, to support better animations;
      // path.pointRadius([3])
      // path({type: "MultiPoint", coordinates:points});
      // context.fillStyle="tomato"
      // context.fill();

      this.UpdatePointsOnGlobe();

      context.beginPath();
      path(this.sphere);
   }

   UpdatePointsOnGlobe = () => {
      let circles = this.svg.selectAll("circle");
      circles
         // .data(filteredPoints)
         .attr("cx", (point) => this.projection(point)[0])
         .attr("cy", (point) => this.projection(point)[1])
         .attr("opacity", (point) => {
            if(this.testVisibility(this.projection)(point))return 1
            else return 0;
         });
   }

   RenderNewPointOnGlobe = (point) => {
      let circle = this.svg.append("circle") 
      .data([point])
      .attr("class", "globepoint")
      .attr('r', 8)
      .attr("cx", (point) => this.projection(point)[0])
      .attr("cy", (point) => this.projection(point)[1])
      .attr("data", point).node()

      let anim = circle.animate([
         {r:"0px"},
         {r:"10px"},
         {r:"0px"},
      ], {duration: animationSpeed, easing: "ease-in-out"})

      anim.onfinish = () => circle.remove();
   }

   //min and max are included
   randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
   CreateRandomPoint(){
      //longitude -180 to 180
      //latitude 0 to 90
      return [this.randomIntFromInterval(-180, 180), this.randomIntFromInterval(0, 90)]

   }

   RandomPointSpawning = () => {
      
      this.RenderNewPointOnGlobe(this.CreateRandomPoint());

      setTimeout(this.RandomPointSpawning, this.randomIntFromInterval(10, 90))
   }


   testVisibility(projection) {
      let visible;
      const stream = projection.stream({ point() { visible = true; } });

      //visible is set to false, if a point is outside the stream, don't set visible to true, 
      // else set visible to true, return visible
      return ([x, y]) => (visible = false, stream.point(x, y), visible);
   }

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
               {/* {this.createNormalGlobe()} */}
            </div>
            <div id="globepoints">
            </div>

         </>
      )
   }
   componentDidMount() {
      let globe = document.querySelector("#globe")

      this.width = globe.clientWidth;
      this.height = globe.clientHeight;

      this.initializeSVG();
      this.createReflectedGlobe();
      this.RandomPointSpawning();

      window.addEventListener("resize", this.WindowEventHandler);
   }

   WindowEventHandler = () => {
      let globe = document.querySelector("#globe")
      let svg = document.querySelector("#globepoints svg")

      this.width = globe.clientWidth;
      this.height = globe.clientHeight;
      svg.remove()
      globe.childNodes[0].remove()
      this.createReflectedGlobe();
      this.initializeSVG();
   }
}
