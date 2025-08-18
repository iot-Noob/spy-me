/**
 * Helper to attach local audio/video to a peer connection
 * @param {RTCPeerConnection} peer - Your peer connection
 * @param {Object} constraints - Media constraints (default: audio+video)
 * @returns {Promise<MediaStream>} The acquired local stream
 */
export async function addLocalMedia(peer, constraints = { audio: true, video: true }) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
    });

    console.log("✅ Local media added to peer");
    return stream;
  } catch (err) {
    console.error("❌ Failed to get local media:", err);
    throw err;
  }
}
