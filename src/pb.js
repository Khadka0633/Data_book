import PocketBase from "pocketbase";

const pb = new PocketBase("https://nexusbackend-production-985a.up.railway.app");

// Keep auth fresh across page reloads automatically
pb.autoCancellation(false);

export default pb;