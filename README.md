HandXR
Real-time hand gestures for interactive 3D experiences in the browser.

HandXR explores controller-free interaction using an ordinary webcam. Track your hand, pinch to select a virtual object, move it across a 3D workspace, and turn your wrist to rotate it. A mouse mode and a built-in task evaluation make it possible to explore the usability of both interaction methods.

Built with MediaPipe, Three.js, JavaScript, WebGL, and Vite.
Features
- Webcam-based tracking of 21 hand landmarks for one hand.
- Raycast selection of a cube, sphere, and torus.
- Pinch-to-grab interaction with separate grab and release thresholds.
- Object translation and screen-plane rotation.
- Adjustable temporal smoothing to reduce pointer jitter.
- Mouse controls for practice and comparison.
- Optional mirrored webcam overlay and hand skeleton visualization.
- Task trials with completion time, placement error, rotation error, and CSV export.
- Live render rate and hand-inference timing.
Quick start
Requirements
- Node.js 20.19+ or 22.12+ and npm.
- A browser with WebGL and webcam support.
- A webcam for gesture mode; mouse mode works without one.
- Internet access to install dependencies and load the hand-tracking runtime and model.
Install and run
Open a terminal in the project folder:
npm install
npm run dev
Open the localhost address printed in the terminal, normally http://127.0.0.1:5173.

On Windows, you can also double-click START.cmd. If PowerShell blocks npm.ps1, use npm.cmd install and npm.cmd run dev.

Serve the app through localhost or HTTPS to enable camera access. Opening index.html directly does not start the application correctly.
How to use
Gesture mode
1. Click Enable camera and allow webcam access.
2. Hold one hand in view with your wrist and fingertips visible.
3. Point your index finger at an object.
4. Pinch your thumb and index finger together to grab it.
5. In Move mode, move your hand to translate the object.
6. In Rotate mode, pinch and turn your wrist to rotate the object.
7. Open the pinch to release it.
Use good lighting and a clear background. Adjust Smoothing to balance stability and responsiveness. Aim at the solid part of an object; the center of the torus is empty.
Control reference
Action	Hand tracking	Mouse
Select and grab	Pinch over an object	Press the left button over an object
Translate in Move mode	Move your hand while pinching	Drag while holding the left button
Rotate in Rotate mode	Turn your wrist while pinching	Drag horizontally
Change depth	Up / Down arrow keys	Mouse wheel or Up / Down arrow keys
Release	Open the pinch	Release the left button
Cancel a trial	Escape	Escape


Select Move or Rotate before grabbing. Switching tools releases the current grab. Reset scene restores the objects and cancels an active trial. Stop camera releases the webcam and returns to mouse mode.
Interaction evaluation
The usability lab provides a cube-placement task for comparing gesture and mouse input.
1. Enter an anonymous participant code.
2. Choose an input mode and click Start trial.
3. Move and rotate the cube to match the wireframe target.
4. Click Finish trial to record the attempt.
5. Repeat with the other input mode and export the results with Export CSV.
Switching between Move and Rotate keeps the trial running. Changing input mode or resetting the scene cancels it. Results are stored in memory: export before refreshing or closing the page.
Recorded measurements
CSV field	Meaning
participant	Anonymous participant identifier
timestamp	Trial completion time in UTC
mode	Mouse or gesture input
target_id	Target configuration, numbered 0-2
completion_seconds	Elapsed time from starting to finishing the trial
position_error_scene_units	Euclidean distance between cube and target centers
rotation_error_degrees	Quaternion angular distance between cube and target orientations
mean_inference_ms	Mean synchronous hand-inference duration; blank for mouse trials
inference_samples	Number of inference measurements in the trial
smoothing	Smoothing slider value at trial completion


Inference time measures the hand-detection call, not end-to-end camera-to-display latency. Rotation error does not account for visually equivalent cube orientations.

Targets cycle through three configurations. For an exploratory comparison, complete each target in both modes, keep smoothing consistent, allow practice, and alternate the starting input mode across participants. Gesture and mouse rotation use different physical motions, which should be documented when interpreting results.
How it works
1. MediaPipe extracts hand landmarks from webcam frames.
2. The thumb-to-index distance is normalized by hand size to detect a pinch.
3. Separate grab/release thresholds reduce rapid state changes near the threshold.
4. A frame-time-adjusted smoothing filter stabilizes the index-finger pointer.
5. Three.js raycasting identifies the object under the pointer.
6. The grabbed object follows pointer movement or wrist rotation, depending on the selected tool.
Tracking loss releases a grabbed object after approximately 160 ms. Depth is controlled explicitly with keys or the mouse wheel rather than estimated from the webcam.
Project structure
HandXR/
|-- index.html                 # Interface structure
|-- src/
|   |-- main.js                # Scene, tracking, controls, and evaluation
|   |-- interaction.js         # Gesture, smoothing, angle, and CSV helpers
|   `-- style.css              # Responsive interface styles
|-- test/
|   `-- interaction.test.js    # Interaction helper tests
|-- package.json              # Dependencies and npm scripts
|-- START.cmd                 # Windows installation and launch shortcut
`-- VALIDATION.md              # Creation-environment validation notes
Development commands
npm test           # Run interaction helper tests
npm run build      # Create the production build in dist/
npm run preview    # Serve the production build locally
Commit the generated package-lock.json after installing dependencies. The included .gitignore excludes node_modules/, dist/, and log files.

For manual verification, check selection, movement, rotation, depth adjustment, camera permissions, tracking loss, camera restart, resizing, trial recording, and CSV export on your target computer.
Privacy and dependencies
Webcam frames are processed in the browser; this application does not upload them or provide a video-storage backend. The hand-tracking runtime and model load from external services, and the interface optionally loads Google Fonts. Camera access starts only after you enable it.
Current scope
HandXR is an interactive computer vision and HCI prototype with an optional webcam overlay. It does not provide calibrated world anchoring, surface detection, or a WebXR headset session. It tracks one hand, uses screen-plane rotation, and runs inference and rendering on the main thread. Performance depends on your hardware and browser.
References
- MediaPipe Hand Landmarker for Web
- Three.js documentation
Author
Syrine Borchani - Computer Science Engineering Student, ENSI