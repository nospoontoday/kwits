export async function base64ToArrayBuffer(base64) {
    // Decode Base64 to a binary string
    const binaryString = atob(base64);
    
    // Create a Uint8Array from the binary string
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create an ArrayBuffer from the Uint8Array
    return bytes.buffer;
}

export async function arrayBufferToBase64(buffer) {
    // Create a Uint8Array from the ArrayBuffer
    const uint8Array = new Uint8Array(buffer);
    
    // Create a binary string from the Uint8Array
    const binaryString = String.fromCharCode.apply(null, uint8Array);
    
    // Convert binary string to Base64
    return btoa(binaryString);
}