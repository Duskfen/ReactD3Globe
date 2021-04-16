import './App.css';
import Globe from './components/Globe'
import { useState } from "react";
import { geoAzimuthalEqualArea, geoConicEqualArea, geoOrthographic, geoEqualEarth, geoStereographic, geoNaturalEarth1 } from 'd3'
import { geoAiry, geoArmadillo, geoBromley, geoCylindricalEqualArea, geoCraster } from "d3-geo-projection"


function App() {
   const [currentProjection, setProjection] = useState([geoOrthographic(), "Orthographic"]);

   const changeProjection = (e) => {

      console.log("switchProjection")

      switch (e.target.value) {
         case "Orthographic":
            setProjection([geoOrthographic(), e.target.value])
            break;
         case "Airy":
            setProjection([geoAiry(), e.target.value])
            break;
         case "Armadillo":
            setProjection([geoArmadillo(), e.target.value])
            break;
         case "geoAzimuthalEqualArea":
            setProjection([geoAzimuthalEqualArea(), e.target.value])
            break;
         case "geoBromley":
            setProjection([geoBromley(), e.target.value])
            break;
         case "geoCylindricalEqualArea":
            setProjection([geoCylindricalEqualArea(), e.target.value])
            break;
         case "geoConicEqualArea":
            setProjection([geoConicEqualArea(), e.target.value])
            break;
         case "geoEqualEarth":
            setProjection([geoEqualEarth(), e.target.value])
            break;
         case "geoCraster":
            setProjection([geoCraster(), e.target.value])
            break;
         case "geoStereographic":
            setProjection([geoStereographic(), e.target.value])
            break;
         case "geoNaturalEarth1":
            setProjection([geoNaturalEarth1(), e.target.value])
            break;
         default: console.log("default, should not happen"); break;
      }
   }

   return (
      <div className="App">
         <header className="App-header">
            Prototyp For React Globe
      </header>
         <main>
            <div className="box" id="projectionChooseWrapper">
               <label>choose a projection</label>
               <select name="projectionSelector" id="projectionSelector" onChange={(e) => changeProjection(e)}>
                  <option value="Orthographic">Orthographic</option>
                  <option value="Airy">Airy</option>
                  {/* <option value="Armadillo">Armadillo</option> */}
                  <option value="geoAzimuthalEqualArea">geoAzimuthalEqualArea</option>
                  <option value="geoBromley">geoBromley</option>
                  <option value="geoCylindricalEqualArea">geoCylindricalEqualArea</option>
                  <option value="geoConicEqualArea">geoConicEqualArea</option>
                  <option value="geoEqualEarth">geoEqualEarth</option>
                  <option value="geoCraster">geoCraster</option>
                  <option value="geoStereographic">geoStereographic</option>
                  <option value="geoNaturalEarth1">geoNaturalEarth1</option>
               </select>
            </div>

            <Globe Projection={{ function: currentProjection[0], name: currentProjection[1] }}></Globe>
         </main>
      </div>
   );
}


export default App;
