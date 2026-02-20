import { useEffect, useRef, useState } from "react"
import * as Cesium from "cesium"
import "cesium/Build/Cesium/Widgets/widgets.css"
import satellite from "satellite.js"

export default function Globe() {
  const viewerRef = useRef(null)
  const [mode, setMode] = useState("EO")

  useEffect(() => {
    window.CESIUM_BASE_URL = "/cesium"

    const viewer = new Cesium.Viewer(viewerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: false
    })

    viewer.scene.globe.enableLighting = true

    // Aircraft
    fetch("https://opensky-network.org/api/states/all")
      .then(res => res.json())
      .then(data => {
        if (!data.states) return
        data.states.slice(0, 50).forEach(state => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              state[5],
              state[6],
              state[7] || 10000
            ),
            point: {
              pixelSize: 6,
              color: Cesium.Color.RED
            }
          })
        })
      })

    // Satellite (ISS)
    fetch("https://celestrak.org/NORAD/elements/stations.txt")
      .then(res => res.text())
      .then(text => {
        const lines = text.split("\n")
        const tle1 = lines[1]
        const tle2 = lines[2]
        const satrec = satellite.twoline2satrec(tle1, tle2)

        setInterval(() => {
          const now = new Date()
          const posVel = satellite.propagate(satrec, now)
          const gmst = satellite.gstime(now)
          const position = satellite.eciToGeodetic(posVel.position, gmst)

          const lat = satellite.degreesLat(position.latitude)
          const lon = satellite.degreesLong(position.longitude)
          const alt = position.height * 1000

          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            point: {
              pixelSize: 8,
              color: Cesium.Color.CYAN
            }
          })
        }, 5000)
      })

    return () => viewer.destroy()
  }, [])

  return (
    <div style={{ height: "100vh", background: "#000" }}>
      <div ref={viewerRef} style={{ height: "100%" }} />
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        color: "#0f0",
        fontFamily: "monospace"
      }}>
        AURORA INTEL SYSTEM
        <br />
        Mode: {mode}
        <br />
        <button onClick={() => setMode("EO")}>EO</button>
        <button onClick={() => setMode("FLIR")}>FLIR</button>
        <button onClick={() => setMode("CRT")}>CRT</button>
      </div>
    </div>
  )
}
