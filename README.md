# FlowShield

FlowShield is a local-first physics-driven flood simulation and early warning dashboard built as a conceptual hackathon sandbox. It predicts hydraulic propagation pathways over procedurally generated terrains to approximate urban impact zones, providing real-time vulnerability clustering and response allocation modelling. 

## Rescue Mobilisation Optimizer
The experimental **Rescue Mobilisation Optimizer** is a proof-of-concept constraint formulation designed to explore greedy routing mechanics against dynamic simulation frames. 
*   **Decisional Support Only**: The system leverages idealized Euclidean distances for routing optimizations and simple uniform assumptions for team capacities.
*   **Operational Unsuitability**: FlowShield should absolutely **not** be deployed operationally or utilized during actual crisis response. Rescue metrics provided by the dashboard constitute conceptual risk-profiling mockups, uncalibrated to real-world logistical contexts.

## Architecture
- **Backend:** Python / FastAPI / Numpy / SciPy
- **Frontend:** React / Vite / TailwindCSS / Leaflet
