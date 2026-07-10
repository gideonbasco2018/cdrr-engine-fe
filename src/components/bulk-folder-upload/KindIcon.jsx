// FILE: src/components/bulk-folder-upload/KindIcon.jsx
import { FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";

function KindIcon({ kind, size = 16 }) {
  if (kind === "pdf") return <FileText size={size} />;
  if (kind === "image") return <ImageIcon size={size} />;
  return <FileIcon size={size} />;
}

export default KindIcon;
