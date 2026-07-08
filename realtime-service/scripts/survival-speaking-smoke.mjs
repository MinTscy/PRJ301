const javaBaseUrl = (process.env.JAVA_LMS_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

const results = [];
for (let levelNumber = 1; levelNumber <= 5; levelNumber += 1) {
  const response = await fetch(`${javaBaseUrl}/api/rooms/survival-speaking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      languageCode: "EN",
      levelNumber,
      displayName: `Survival Speaking Level ${levelNumber}`
    })
  });
  if (!response.ok) {
    throw new Error(`Level ${levelNumber} room failed: ${response.status} ${await response.text()}`);
  }
  const room = await response.json();
  const timelineResponse = await fetch(`${javaBaseUrl}/api/rooms/${room.roomCode}/timeline`);
  if (!timelineResponse.ok) {
    throw new Error(`Timeline failed for ${room.roomCode}`);
  }
  const timeline = await timelineResponse.json();
  results.push({
    levelNumber,
    roomCode: room.roomCode,
    timelineSteps: timeline.steps.length,
    currentStep: timeline.currentStep?.subOrder ?? null
  });
}

console.log(JSON.stringify({ status: "PASS", rooms: results }, null, 2));
