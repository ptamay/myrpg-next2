"use client";
import Script from "next/script";

export default function GlobalScripts() {
  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js" strategy="lazyOnload" />
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js" 
        strategy="lazyOnload" 
        onLoad={() => {
          if (typeof (window as any).pdfjsLib !== 'undefined') {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          }
        }}
      />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js" strategy="lazyOnload" />
    </>
  );
}
