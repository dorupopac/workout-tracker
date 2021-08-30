What this application does:

1. page loads -> the map renders on the user's current location and the workouts found in the localStorage will render
2. user clicks on map -> the workout form renders
3. user submits new workout -> a marker appears on the map, the workout saves in localStorage and renders in the list
4. user clicks on workout in the list -> map moves to the workout location
5. user clicks on "X" on the top right corner of a workout, it gets deleted from the list along with the marker, and the localStorage updates.
6. Whenever a workout is in the list, there will always be a button on the bottom right corner of the container to reset all workouts.
