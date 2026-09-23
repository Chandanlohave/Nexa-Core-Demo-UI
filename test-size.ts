import fs from 'fs';
async function test() {
    const url = "https://image.pollinations.ai/prompt/ironman?width=1024&height=1024&nologo=true";
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    console.log("Size default:", buf.byteLength);
}
test();
