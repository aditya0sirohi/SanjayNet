## SANJAYNET

**Multi-Source Geospatial Surveillance & Intelligence System**

SanjayNet is a geospatial intelligence platform that fuses multiple real-time spatial data sources to detect patterns, anomalies, and potential crisis signals.

The system visualizes and correlates signals such as:

* Airspace activity
* Weather conditions
* Behavioral anomalies
* Spatial clustering

to identify regions that may require operational attention.

The goal of SanjayNet is to provide a **single geospatial interface that transforms scattered situational data into actionable spatial intelligence.**

---

# Problem

During emergencies and large-scale events, information is fragmented across multiple systems.

Example:

* Weather platforms show storms
* Flight trackers show aircraft
* Satellite imagery shows fires or floods
* Government dashboards show alerts

However these signals exist in **separate systems**, forcing analysts and decision makers to manually correlate them.

This creates delays in identifying emerging situations.

---

# Our Idea

SanjayNet aims to unify these signals into a **single geospatial intelligence interface**.

Instead of viewing raw data streams independently, the system:

1. Collects spatial signals from multiple sources
2. Detects spatial patterns and anomalies
3. Correlates signals to identify areas of potential concern
4. Visualizes the results on a real-time 3D globe

This transforms raw geospatial data into **situational awareness.**

---

# Current Prototype

The current prototype demonstrates the core concept of SanjayNet.

The system ingests real-time aircraft data and overlays multiple analytical layers to detect spatial patterns.

The prototype currently includes:

### 1. Airspace Activity Detection

Clusters of aircraft within defined grid cells are detected automatically and visualized as **high activity zones**.

These zones highlight regions with unusually dense airspace activity.

---

### 2. Weather Signal Integration

Weather conditions such as rain, clouds, or temperature anomalies are plotted geographically and correlated with aircraft activity.

This allows the system to detect areas where **environmental conditions may impact airspace activity.**

---

### 3. Behavioral Anomaly Detection

Aircraft that remain within a confined geographic region over time are classified as **loitering aircraft**.

This behavior may indicate:

* surveillance
* emergency response
* operational anomalies

---

### 4. Signal Correlation

The platform correlates activity zones, weather signals, and aircraft behavior to infer potential operational patterns.

This demonstrates the core idea of **multi-source spatial intelligence.**

---

# Demo

Below are example outputs from the prototype system.

## Global Airspace Overview

*(insert screenshot)*

Real-time aircraft signals are visualized globally on a 3D geospatial interface.

---

## Airspace Activity Detection

<img width="1524" height="954" alt="Screenshot 2026-03-10 182026" src="https://github.com/user-attachments/assets/a02add85-09d1-4971-a3e1-92bee3a17b7c" />


Aircraft density clusters are automatically detected and marked as **high activity zones**.

---

## Weather Impact Layer

<img width="1494" height="808" alt="Screenshot 2026-03-11 205114" src="https://github.com/user-attachments/assets/03ff158f-e204-4aad-92c0-d0812fcffa61" />


Weather signals are integrated with airspace data to highlight regions where environmental conditions may influence aircraft movement.

---

## Behavioral Anomaly Detection

<img width="1528" height="988" alt="Screenshot 2026-03-11 211557" src="https://github.com/user-attachments/assets/e0ca06e9-9ba6-4b5c-9411-b216541a3410" />


Aircraft that remain within a confined area are detected and labeled as **loitering aircraft**.

---

## Multi-Signal Spatial Intelligence

<img width="1516" height="962" alt="Screenshot 2026-03-11 211521" src="https://github.com/user-attachments/assets/55195c90-2650-4c52-a579-27183cf92ca0" />


Multiple signals are correlated to reveal patterns that may indicate operational activity.

---

# Technology Stack

Frontend

* React
* CesiumJS
* Vite

Data Sources

* OpenSky Network API (aircraft telemetry)

Geospatial Visualization

* Cesium 3D Globe

---

# Future Scope

SanjayNet is currently a prototype. The following capabilities are planned for future development.

### Satellite Data Integration

Integration with satellite imagery to detect:

* wildfire hotspots
* flooding
* environmental hazards

---

### Disaster Intelligence

Automatic detection of potential crisis zones by correlating:

* weather anomalies
* aircraft activity
* satellite signals

---

### Predictive Geospatial Analytics

Machine learning models to predict:

* infrastructure stress
* disaster impact zones
* airspace disruptions

---

### Global Coverage Expansion

Expansion beyond the current monitored regions to provide **global situational awareness.**

---

# Potential Applications

SanjayNet could assist in scenarios such as:

* disaster response coordination
* aviation monitoring
* environmental hazard detection
* emergency logistics planning
* situational awareness dashboards

---

# Project Status

This project was developed as a **hackathon prototype** to demonstrate the feasibility of multi-source geospatial intelligence systems.

The current version focuses on:

* signal visualization
* spatial pattern detection
* proof-of-concept analytics

Future development will focus on **scalability, data fusion, and predictive intelligence.**

---

# Repository Structure

```
backend/
frontend/
   src/
      components/
         MapViewer.jsx
```

---

# Authors


Team SanjayNet

