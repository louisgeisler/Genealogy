self.onmessage = function(event) {
    const filePath = event.data.filePath;
    const passphrase = event.data.passphrase;

    fetchAndDecryptToArrayBuffer(filePath, passphrase)
        .then(result => {
            self.postMessage(result, [result]);
        })
        .catch(error => {
            self.postMessage({ error: error.message });
        });
};

async function fetchAndDecryptToArrayBuffer(filePath, passphrase) {
    // Fetch the blob and extract it from the response
    const response = await fetch(filePath);
    const blob = await response.blob();

    const decryptedData = await decryptData(blob, passphrase);

    return decryptedData.data;
}

async function decryptData(blob, passphrase) {
    // Convert blob to ArrayBuffer
    const blobBuffer = await blob.arrayBuffer();

    // Extract the MIME type length, which was stored in the first byte
    const mimeTypeLength = new Uint8Array(blobBuffer, 0, 1)[0];

    // Extract the MIME type using the length
    const mimeTypeDecoder = new TextDecoder();
    const mimeType = mimeTypeDecoder.decode(new Uint8Array(blobBuffer, 1, mimeTypeLength));

    // Extract the salt, IV, and encrypted data
    const saltStart = 1 + mimeTypeLength;
    const ivStart = saltStart + 16;
    const dataStart = ivStart + 12;

    const salt = new Uint8Array(blobBuffer, saltStart, 16);
    const iv = new Uint8Array(blobBuffer, ivStart, 12);
    const encryptedData = blobBuffer.slice(dataStart);

    const key = await deriveKey(passphrase, salt);

    // Decrypt the data
    const decryptedDataBuffer = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: iv
    }, key, encryptedData);

    return {
        mimeType: mimeType,
        data: decryptedDataBuffer
    };
}

async function deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
        },
        passphraseKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}