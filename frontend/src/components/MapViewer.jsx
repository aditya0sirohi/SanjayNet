import { useEffect, useRef, useState } from "react"
import * as Cesium from "cesium"
import "cesium/Build/Cesium/Widgets/widgets.css"

const GOOGLE_API_KEY = ""

// Simple inline SVG airplane icon to avoid external asset dependency
const PLANE_SVG =
  "data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' stroke='%2300e5ff' stroke-width='2'%3E%3Cpath d='M6 30l22 2L18 8l6-4 14 22 16 2c2 .2 4 2.4 4 4s-2 3.8-4 4L38 38 24 60l-6-4 10-22-22-2z'/%3E%3C/g%3E%3C/svg%3E"

// India bounding box for OpenSky
const INDIA_BOUNDS = {
  lamin: 6.5, lomin: 68.0,
  lamax: 35.5, lomax: 97.5
}

function MapViewer() {
  const viewerRef = useRef()
  const viewerInstance = useRef(null)
  const aircraftEntities = useRef({})
  const activityRegionsRef = useRef([])
  const aircraftHistoryRef = useRef({})
  const [aircraftCount, setAircraftCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [weatherImpactSignals, setWeatherImpactSignals] = useState(0)
  const [emergencySignalCount, setEmergencySignalCount] = useState(0)

  const addWeatherLayer = (viewer) => {
    const weatherPoints = [
      {
        lon: 72.8777,
        lat: 19.0760,
        label: "Heavy Rain",
        color: Cesium.Color.CYAN,
        icon: "☔",
      },
      {
        lon: 77.1025,
        lat: 28.7041,
        label: "Cloudy",
        color: Cesium.Color.LIGHTGRAY,
        icon: "☁",
      },
      {
        lon: 88.3639,
        lat: 22.5726,
        label: "High Temp",
        color: Cesium.Color.ORANGE,
        icon: "⛅",
      },
    ]

    weatherPoints.forEach((p) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0),
        point: {
          pixelSize: 10,
          color: p.color.withAlpha(0.9),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
        },
        label: {
          text: `${p.icon} ${p.label}`,
          font: "12px 'Segoe UI', sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000),
        },
      })
    })
  }

  const fetchAndRenderAircraft = async (viewer) => {
    try {
      const { lamin, lomin, lamax, lomax } = INDIA_BOUNDS
      const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`

      const res = await fetch(url)
      const data = await res.json()

      if (!data.states) return

      const currentCallsigns = new Set()
      const gridCounts = new Map()
      const GRID_SIZE_DEG = 1
      const loiteringByCellKey = new Map()

      data.states.forEach((state) => {
        const callsign = state[1]?.trim() || "UNKNOWN"
        const lon = state[5]
        const lat = state[6]
        const alt = state[7] || 10000
        const velocity = state[9] || 0
        const heading = state[10] || 0

        if (lon == null || lat == null) return
        currentCallsigns.add(callsign)

        // Update per-aircraft history (lat, lon, timestamp) for loitering detection
        const existingHistory = aircraftHistoryRef.current[callsign] || []
        const updatedHistory = [
          ...existingHistory,
          { lat, lon, timestamp: Date.now() },
        ].slice(-5)
        aircraftHistoryRef.current[callsign] = updatedHistory

        let isLoitering = false
        if (updatedHistory.length >= 5) {
          let minLat = updatedHistory[0].lat
          let maxLat = updatedHistory[0].lat
          let minLon = updatedHistory[0].lon
          let maxLon = updatedHistory[0].lon
          updatedHistory.forEach((p) => {
            if (p.lat < minLat) minLat = p.lat
            if (p.lat > maxLat) maxLat = p.lat
            if (p.lon < minLon) minLon = p.lon
            if (p.lon > maxLon) maxLon = p.lon
          })
          const latSpan = maxLat - minLat
          const lonSpan = maxLon - minLon
          const withinRadius = latSpan < 0.05 && lonSpan < 0.05
          const hasSpeed = state[9] != null
          if (hasSpeed) {
            if (withinRadius && velocity < 120) {
              isLoitering = true
            }
          } else if (withinRadius) {
            isLoitering = true
          }
        }

        const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt)

        // Update / create aircraft entity + short trajectory trail
        const existing = aircraftEntities.current[callsign]
        if (existing) {
          existing.positionHistory.push(position)
          if (existing.positionHistory.length > 5) {
            existing.positionHistory.shift()
          }

          existing.entity.position = position
          if (existing.entity.billboard) {
            existing.entity.billboard.rotation = Cesium.Math.toRadians(heading)
          }

          // Recreate the trail entity each update so Cesium picks up new positions
          if (existing.trailEntity) {
            viewer.entities.remove(existing.trailEntity)
          }
          existing.trailEntity = viewer.entities.add({
            polyline: {
              positions: [...existing.positionHistory],
              width: 1.5,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.CYAN.withAlpha(0.4),
                dashLength: 10,
              }),
              clampToGround: false,
            },
          })
          existing.entity.description = `
            <b>Callsign:</b> ${callsign}<br/>
            <b>Altitude:</b> ${Math.round(alt)} m<br/>
            <b>Speed:</b> ${Math.round(velocity)} m/s<br/>
            <b>Heading:</b> ${Math.round(heading)}°
          `
          if (existing.entity.billboard) {
            existing.entity.billboard.color = isLoitering
              ? Cesium.Color.YELLOW
              : Cesium.Color.WHITE
          }
          if (isLoitering) {
            if (!existing.loiterLabelEntity) {
              const loiterLabel = viewer.entities.add({
                position,
                label: {
                  text: "⚠ LOITERING AIRCRAFT",
                  font: "13px Segoe UI",
                  fillColor: Cesium.Color.YELLOW,
                  outlineColor: Cesium.Color.BLACK,
                  outlineWidth: 2,
                  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                  pixelOffset: new Cesium.Cartesian2(0, -60),
                  distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                    0,
                    6000000
                  ),
                },
              })
              existing.loiterLabelEntity = loiterLabel
            }
          } else if (existing.loiterLabelEntity) {
            viewer.entities.remove(existing.loiterLabelEntity)
            existing.loiterLabelEntity = null
          }
        } else {
          const positionHistory = [position]

          const entity = viewer.entities.add({
            position,
            billboard: {
              image: PLANE_SVG,
              width: 32,
              height: 32,
              color: Cesium.Color.WHITE,
              rotation: Cesium.Math.toRadians(heading),
              alignedAxis: Cesium.Cartesian3.UNIT_Z,
              scaleByDistance: new Cesium.NearFarScalar(1000, 1.2, 5000000, 0.4),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000000),
            },
            description: `
              <b>Callsign:</b> ${callsign}<br/>
              <b>Altitude:</b> ${Math.round(alt)} m<br/>
              <b>Speed:</b> ${Math.round(velocity)} m/s<br/>
              <b>Heading:</b> ${Math.round(heading)}°
            `,
          })

          if (entity.billboard) {
            entity.billboard.color = isLoitering
              ? Cesium.Color.YELLOW
              : Cesium.Color.WHITE
          }

          const trailEntity = viewer.entities.add({
            polyline: {
              positions: [...positionHistory],
              width: 1.5,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.CYAN.withAlpha(0.4),
                dashLength: 10,
              }),
              clampToGround: false,
            },
          })

          aircraftEntities.current[callsign] = {
            entity,
            trailEntity,
            positionHistory,
            loiterLabelEntity: null,
          }

          if (isLoitering) {
            const loiterLabel = viewer.entities.add({
              position,
              label: {
                text: "⚠ LOITERING AIRCRAFT",
                font: "13px Segoe UI",
                fillColor: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                  0,
                  6000000
                ),
              },
            })
            aircraftEntities.current[callsign].loiterLabelEntity = loiterLabel
          }
        }

        // Simple activity grid bucket
        const latCell = Math.floor(lat / GRID_SIZE_DEG) * GRID_SIZE_DEG
        const lonCell = Math.floor(lon / GRID_SIZE_DEG) * GRID_SIZE_DEG
        const key = `${latCell}:${lonCell}`
        let cell = gridCounts.get(key)
        if (!cell) {
          cell = {
            count: 0,
            latMin: latCell,
            latMax: latCell + GRID_SIZE_DEG,
            lonMin: lonCell,
            lonMax: lonCell + GRID_SIZE_DEG,
          }
          gridCounts.set(key, cell)
        }
        cell.count += 1

        if (isLoitering) {
          loiteringByCellKey.set(key, true)
        }
      })

      // Remove aircraft that left the region
      Object.keys(aircraftEntities.current).forEach((cs) => {
        if (!currentCallsigns.has(cs)) {
          const record = aircraftEntities.current[cs]
          if (record?.entity) viewer.entities.remove(record.entity)
          if (record?.trailEntity) viewer.entities.remove(record.trailEntity)
           if (record?.loiterLabelEntity) viewer.entities.remove(record.loiterLabelEntity)
          delete aircraftEntities.current[cs]
          delete aircraftHistoryRef.current[cs]
        }
      })

      // Dashboard metrics
      setAircraftCount(currentCallsigns.size)
      setLastUpdate(new Date())

      // High activity regions
      activityRegionsRef.current.forEach((entity) => {
        viewer.entities.remove(entity)
      })
      activityRegionsRef.current = []

      const ACTIVITY_THRESHOLD = 3
      const weatherPointsForCorrelation = [
        { lon: 72.8777, lat: 19.0760 },
        { lon: 77.1025, lat: 28.7041 },
        { lon: 88.3639, lat: 22.5726 },
      ]
      let weatherImpactZonesThisTick = 0
      let emergencyZonesThisTick = 0

      gridCounts.forEach((cell) => {
        if (cell.count >= ACTIVITY_THRESHOLD) {
          const centerLat = (cell.latMin + cell.latMax) / 2
          const centerLon = (cell.lonMin + cell.lonMax) / 2

          let hasWeatherSignal = false
          weatherPointsForCorrelation.forEach((w) => {
            if (
              w.lon >= cell.lonMin &&
              w.lon <= cell.lonMax &&
              w.lat >= cell.latMin &&
              w.lat <= cell.latMax
            ) {
              hasWeatherSignal = true
            }
          })

          const regionEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 0),
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                cell.lonMin,
                cell.latMin,
                cell.lonMax,
                cell.latMax
              ),
              material: Cesium.Color.RED.withAlpha(0.18),
              outline: true,
              outlineColor: Cesium.Color.RED.withAlpha(0.9),
              outlineWidth: 2,
            },
            label: {
              text: "⚠ HIGH ACTIVITY DETECTED",
              font: "13px 'Segoe UI', sans-serif",
              fillColor: Cesium.Color.RED,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -40),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000000),
            },
          })
          activityRegionsRef.current.push(regionEntity)

          if (hasWeatherSignal) {
            const weatherImpactLabelEntity = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 0),
              label: {
                text: "⚠ WEATHER IMPACT ZONE",
                font: "13px Segoe UI",
                fillColor: Cesium.Color.ORANGE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -70),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                  0,
                  6000000
                ),
              },
            })
            activityRegionsRef.current.push(weatherImpactLabelEntity)
            weatherImpactZonesThisTick += 1
          }

          const cellKey = `${cell.latMin}:${cell.lonMin}`
          const hasLoiteringInCell = loiteringByCellKey.get(cellKey) === true
          if (hasWeatherSignal && hasLoiteringInCell) {
            const emergencyRectEntity = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 0),
              rectangle: {
                coordinates: Cesium.Rectangle.fromDegrees(
                  cell.lonMin,
                  cell.latMin,
                  cell.lonMax,
                  cell.latMax
                ),
                material: Cesium.Color.PURPLE.withAlpha(0.4),
                outline: true,
                outlineColor: Cesium.Color.WHITE,
              },
            })

            const emergencyLabelEntity = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 0),
              label: {
                text: "🚨 EMERGENCY RESPONSE ZONE",
                font: "14px Segoe UI",
                fillColor: Cesium.Color.PURPLE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -100),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                  0,
                  6000000
                ),
              },
            })

            activityRegionsRef.current.push(emergencyRectEntity)
            activityRegionsRef.current.push(emergencyLabelEntity)
            emergencyZonesThisTick += 1
          }
        }
      })

      setWeatherImpactSignals(weatherImpactZonesThisTick)
      setEmergencySignalCount(emergencyZonesThisTick)
    } catch (err) {
      console.warn("OpenSky fetch failed:", err.message)
    }

    // Force re-render after aircraft update
    if (viewerInstance.current) {
      viewerInstance.current.scene.requestRender()
    }
  }

  useEffect(() => {
    let intervalId

    const initViewer = async () => {
      const googleTiles = await Cesium.createGooglePhotorealistic3DTileset({
        key: GOOGLE_API_KEY,
      })

      const viewer = new Cesium.Viewer(viewerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        globe: false,
        requestRenderMode: true,
        maximumRenderTimeChange: 0.1,
        shadows: false,
      })

      // Scene optimization
      viewer.scene.postProcessStages.fxaa.enabled = false
      viewer.scene.fog.enabled = false

      // Tileset optimization
      googleTiles.maximumScreenSpaceError = 8

      viewer.scene.primitives.add(googleTiles)
      viewerInstance.current = viewer

      addWeatherLayer(viewer)

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(78.9629, 20.5937, 1200000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-40),
          roll: 0,
        },
        duration: 3,
      })

      // Fetch immediately then every 30 seconds
      fetchAndRenderAircraft(viewer)
      intervalId = setInterval(() => fetchAndRenderAircraft(viewer), 30000)
    }

    initViewer()

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (viewerInstance.current && !viewerInstance.current.isDestroyed()) {
        viewerInstance.current.destroy()
      }
    }
  }, [])

  const formattedLastUpdate =
    lastUpdate &&
    lastUpdate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(7, 10, 25, 0.9)",
          color: "#ffffff",
          zIndex: 1,
          pointerEvents: "none",
          boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
          maxWidth: 260,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0.6,
            marginBottom: 2,
          }}
        >
          SANJAYNET
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.8,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          Multi-Source Situational Awareness
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <div>
            <span style={{ opacity: 0.7 }}>Signals Detected:</span>{" "}
            <span style={{ fontWeight: 600 }}>
              {aircraftCount + weatherImpactSignals + emergencySignalCount}
            </span>
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>Last Update:</span>{" "}
            <span style={{ fontWeight: 500 }}>
              {formattedLastUpdate || "—"}
            </span>
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>Layers:</span>{" "}
            <span style={{ fontWeight: 500 }}>
              Airspace · Weather · Anomaly
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapViewer
