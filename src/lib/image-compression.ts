/**
 * Compresse et redimensionne une image vers le format WebP à max 1200px.
 * Réduit les photos de 5-15 Mo prises sur smartphone/caméra à ~150-250 Ko
 * tout en conservant une excellente netteté pour la lecture des certificats.
 */
export async function compressImageToWebP(
  fileOrBlob: File | Blob,
  maxDimension = 1200,
  quality = 0.82
): Promise<File> {
  // Les PDF ne sont pas compressés par le canvas
  if (fileOrBlob.type === "application/pdf") {
    if (fileOrBlob instanceof File) return fileOrBlob;
    return new File([fileOrBlob], "document.pdf", { type: "application/pdf" });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionnement proportionnel (max 1200px)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return resolve(
            fileOrBlob instanceof File
              ? fileOrBlob
              : new File([fileOrBlob], "justificatif.jpg", { type: "image/jpeg" })
          );
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(
                fileOrBlob instanceof File
                  ? fileOrBlob
                  : new File([fileOrBlob], "justificatif.jpg", { type: "image/jpeg" })
              );
            }

            const originalName = fileOrBlob instanceof File ? fileOrBlob.name : "camera_photo";
            const baseName = originalName.replace(/\.[^/.]+$/, "");
            const finalName = `${baseName}.webp`;

            const compressedFile = new File([blob], finalName, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => {
        resolve(
          fileOrBlob instanceof File
            ? fileOrBlob
            : new File([fileOrBlob], "justificatif.jpg", { type: "image/jpeg" })
        );
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(
        fileOrBlob instanceof File
          ? fileOrBlob
          : new File([fileOrBlob], "justificatif.jpg", { type: "image/jpeg" })
      );
    };

    reader.readAsDataURL(fileOrBlob);
  });
}
