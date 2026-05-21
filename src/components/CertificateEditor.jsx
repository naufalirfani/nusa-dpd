import { useState, useRef, useEffect } from "react";
import {
  Stage,
  Layer,
  Line,
  Image as KonvaImage,
  Text,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faCloudUploadAlt,
  faImage,
  faUndo,
  faPlus,
  faMinus,
  faBold,
  faItalic,
  faUnderline,
  faArrowUp,
  faArrowDown,
  faCopy,
  faTrash,
  faCheck,
  faPalette,
  faFont,
} from "@fortawesome/free-solid-svg-icons";
import SearchableSelect from "./SearchableSelect";
import { deleteMediaFile, getMediaFiles, uploadMedia } from "../config/api";
import Swal from "sweetalert2";

// Default certificate design - centered on A4 landscape canvas (scaled for 100% display)
const DEFAULT_CERTIFICATE_DESIGN = {
  background: "bg_Sertifikat.png",
  width: 973.6,
  height: 688.8,
  elements: [
    {
      id: "title",
      type: "text",
      value: "SERTIFIKAT",
      x: 97.9,
      y: 112.8,
      fontSize: 46.2,
      fontFamily: "Arial",
      fontStyle: "bold",
      fill: "#1a1a1a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "nomor",
      type: "text",
      value: "Nomor: {{nomor_sertifikat}}",
      x: 99,
      y: 162.7,
      fontSize: 22,
      fontFamily: "Arial",
      fill: "#4a4a4a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "subtitle",
      type: "text",
      value: "Diberikan kepada:",
      x: 99,
      y: 215.9,
      fontSize: 19.8,
      fontFamily: "Arial",
      fill: "#4a4a4a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "name",
      type: "text",
      value: "{{nama}}",
      x: 44,
      y: 253.8,
      fontSize: 44,
      fontFamily: "Playfair Display",
      fontStyle: "bold",
      fill: "#dfa734",
      align: "center",
      width: 886.6,
      offsetX: 444.4,
    },
    {
      id: "description",
      type: "text",
      value: "Atas partisipasi sebagai **{{peran}}** dalam kegiatan",
      x: 42.9,
      y: 333,
      fontSize: 17.6,
      fontFamily: "Arial",
      fill: "#2a2a2a",
      align: "center",
      width: 886.6,
      offsetX: 444.4,
      lineHeight: 1.5,
    },
    {
      id: "description2",
      type: "text",
      value: "{{nama_kegiatan}}",
      x: 44,
      y: 356.9,
      fontSize: 17.6,
      fontStyle: "bold",
      fontFamily: "Arial",
      fill: "#2a2a2a",
      align: "center",
      width: 886.6,
      offsetX: 444.4,
      lineHeight: 1.5,
    },
    {
      id: "description3",
      type: "text",
      value: 'dengan tema "{{judul_kegiatan}}"',
      x: 42.9,
      y: 378.6,
      fontSize: 17.6,
      fontFamily: "Arial",
      fill: "#2a2a2a",
      align: "center",
      width: 886.6,
      offsetX: 444.4,
      lineHeight: 1.5,
    },
    {
      id: "description4",
      type: "text",
      value:
        "yang diselenggarakan selama **2 JP** oleh Sekretariat Jenderal DPD RI",
      x: 42.9,
      y: 401.3,
      fontSize: 17.6,
      fontFamily: "Arial",
      fill: "#2a2a2a",
      align: "center",
      width: 886.6,
      offsetX: 444.4,
      lineHeight: 1.5,
    },
    {
      id: "date",
      type: "text",
      value: "Jakarta, {{tanggal}}",
      x: 97.9,
      y: 444.7,
      fontSize: 17.6,
      fontFamily: "Arial",
      fill: "#4a4a4a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "instansi",
      type: "text",
      value: "Kepala Biro Organisasi, Keanggotaan, dan Kepegawaian",
      x: 99,
      y: 466.4,
      fontSize: 17.6,
      fontFamily: "Arial",
      fill: "#4a4a4a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "nama_ttd",
      type: "text",
      value: "Dr. Fitriani, AP., M.Si.",
      x: 99,
      y: 609.6,
      fontSize: 17.6,
      fontStyle: "bold",
      fontFamily: "Arial",
      textDecoration: "underline",
      fill: "#4a4a4a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "nip_ttd",
      type: "text",
      value: "NIP. 197410171993112001",
      x: 99,
      y: 633.5,
      fontSize: 17.6,
      fontFamily: "Arial",
      fill: "#4a4a4a",
      align: "center",
      width: 776.6,
      offsetX: 389.4,
    },
    {
      id: "logo_dpd",
      type: "image",
      src: `${import.meta.env.VITE_API_BASE_URL}/logo-dpd.png`,
      path: "logo-dpd.png",
      x: 447.7,
      y: 21.7,
      width: 79.2,
      height: 75.9,
      fitted: true,
    },
    {
      id: "berakhlak",
      type: "image",
      src: `${import.meta.env.VITE_API_BASE_URL}/berakhlak.png`,
      path: "berakhlak.png",
      x: 689.7,
      y: 615,
      width: 277.2,
      height: 69.4,
      fitted: true,
    },
    {
      id: "cap_dpd",
      type: "image",
      src: `${import.meta.env.VITE_API_BASE_URL}/cap-dpd.png`,
      path: "cap-dpd.png",
      x: 287.1,
      y: 472.9,
      width: 170.5,
      height: 151.9,
      fitted: true,
    },
    {
      id: "ttd_okk",
      type: "image",
      src: `${import.meta.env.VITE_API_BASE_URL}/ttd-okk.png`,
      path: "ttd-okk.png",
      x: 327.8,
      y: 466.4,
      width: 305.8,
      height: 190.9,
      fitted: true,
    },
    {
      id: "qrcode",
      type: "image",
      src: `${import.meta.env.VITE_API_BASE_URL}/qrcode-placeholder.jpg`,
      path: "qrcode-placeholder.jpg",
      x: 781,
      y: 531.5,
      width: 77,
      height: 75.9,
      fitted: true,
    },
  ],
};

const FONT_OPTIONS = [
  { value: "Arial", label: "Arial", name: "Arial" },
  { value: "Helvetica", label: "Helvetica", name: "Helvetica" },
  {
    value: "Times New Roman",
    label: "Times New Roman",
    name: "Times New Roman",
  },
  { value: "Georgia", label: "Georgia", name: "Georgia" },
  { value: "Garamond", label: "Garamond", name: "Garamond" },
  {
    value: "Palatino Linotype",
    label: "Palatino Linotype",
    name: "Palatino Linotype",
  },
  { value: "Book Antiqua", label: "Book Antiqua", name: "Book Antiqua" },
  { value: "Courier New", label: "Courier New", name: "Courier New" },
  { value: "Courier", label: "Courier", name: "Courier" },
  { value: "Lucida Console", label: "Lucida Console", name: "Lucida Console" },
  { value: "Verdana", label: "Verdana", name: "Verdana" },
  { value: "Tahoma", label: "Tahoma", name: "Tahoma" },
  { value: "Trebuchet MS", label: "Trebuchet MS", name: "Trebuchet MS" },
  { value: "Impact", label: "Impact", name: "Impact" },
  { value: "Comic Sans MS", label: "Comic Sans MS", name: "Comic Sans MS" },
  {
    value: "Brush Script MT",
    label: "Brush Script MT",
    name: "Brush Script MT",
  },
  {
    value: "Lucida Handwriting",
    label: "Lucida Handwriting",
    name: "Lucida Handwriting",
  },
  { value: "Copperplate", label: "Copperplate", name: "Copperplate" },
  {
    value: "Playfair Display",
    label: "Playfair Display",
    name: "Playfair Display",
  },
  {
    value: "Libre Baskerville",
    label: "Libre Baskerville",
    name: "Libre Baskerville",
  },
  {
    value: "Cormorant Garamond",
    label: "Cormorant Garamond",
    name: "Cormorant Garamond",
  },
  { value: "Cinzel", label: "Cinzel", name: "Cinzel" },
  { value: "Great Vibes", label: "Great Vibes", name: "Great Vibes" },
];

const STYLE_OPTIONS = [
  { value: "normal", label: "Normal", name: "Normal" },
  { value: "bold", label: "Bold", name: "Bold" },
  { value: "italic", label: "Italic", name: "Italic" },
  { value: "bold italic", label: "Bold Italic", name: "Bold Italic" },
];

const ALIGN_OPTIONS = [
  { value: "left", label: "Left", name: "Left" },
  { value: "center", label: "Center", name: "Center" },
  { value: "right", label: "Right", name: "Right" },
];

// Function to parse HTML and strip tags (preserve line breaks)
function parseHTMLText(htmlText) {
  // Remove HTML tags for Konva rendering but preserve line breaks
  let text = htmlText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return text;
}

// Function to check if text contains HTML
function containsHTML(text) {
  return /<[^>]*>/g.test(text);
}

// Function to check if text contains markdown-style formatting
function containsMarkdown(text) {
  return /\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_/g.test(text);
}

// Function to parse markdown-style formatting
// Supports: **bold**, *italic*, __underline__, _italic_
function parseMarkdownFormatting(text) {
  const segments = [];
  let lastIndex = 0;
  
  // Regex untuk mendeteksi **bold**, *italic*, __underline__, _italic_
  const regex = /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        fontStyle: '',
        textDecoration: ''
      });
    }
    
    // Add formatted text
    if (match[1]) {
      // **bold**
      segments.push({
        text: match[2],
        fontStyle: 'bold',
        textDecoration: ''
      });
    } else if (match[3]) {
      // __underline__
      segments.push({
        text: match[4],
        fontStyle: '',
        textDecoration: 'underline'
      });
    } else if (match[5]) {
      // *italic*
      segments.push({
        text: match[6],
        fontStyle: 'italic',
        textDecoration: ''
      });
    } else if (match[7]) {
      // _italic_
      segments.push({
        text: match[8],
        fontStyle: 'italic',
        textDecoration: ''
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining plain text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      fontStyle: '',
      textDecoration: ''
    });
  }
  
  return segments;
}

// Component for each text element with markdown support
function EditableText({
  element,
  isSelected,
  onSelect,
  onChange,
  onDoubleClick,
  previewText,
}) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Use preview text if provided, otherwise use original value
  const textToDisplay = previewText || element.value;

  // Process text value
  let displayText = textToDisplay;
  let hasMarkdown = false;
  
  // Convert HTML to plain text if needed
  if (containsHTML(displayText)) {
    displayText = parseHTMLText(displayText);
  }
  
  // Check if text contains markdown formatting
  hasMarkdown = containsMarkdown(displayText);
  
  // If no markdown formatting, render simple text
  if (!hasMarkdown) {
    return (
      <>
        <Text
          ref={shapeRef}
          id={element.id}
          text={displayText}
          x={element.x}
          y={element.y}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={element.fontStyle}
          textDecoration={element.textDecoration || ""}
          fill={element.fill}
          align={element.align}
          width={element.width}
          lineHeight={element.lineHeight || 1.15}
          draggable
          onClick={(e) => {
            onSelect();
          }}
          onDblClick={onDoubleClick}
          onTap={onSelect}
          onDragEnd={(e) => {
            onChange({
              ...element,
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
          onTransformEnd={(e) => {
            const node = shapeRef.current;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            onChange({
              ...element,
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              fontSize: Math.max(5, element.fontSize * scaleY),
            });
          }}
        />
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </>
    );
  }
  
  // Parse markdown and render with multiple text nodes
  const segments = parseMarkdownFormatting(displayText);
  
  // Create a temporary canvas to measure text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Group segments by lines
  const lines = [];
  let currentLine = [];
  let currentLineWidth = 0;
  
  segments.forEach((segment) => {
    const textLines = segment.text.split('\n');
    
    textLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        // New line detected, save current line and start new one
        lines.push({
          segments: currentLine,
          width: currentLineWidth,
        });
        currentLine = [];
        currentLineWidth = 0;
      }
      
      if (line) {
        // Combine fontStyle from element and segment
        let combinedFontStyle = element.fontStyle || '';
        if (segment.fontStyle) {
          if (combinedFontStyle && combinedFontStyle !== segment.fontStyle) {
            combinedFontStyle = `${segment.fontStyle} ${combinedFontStyle}`;
          } else {
            combinedFontStyle = segment.fontStyle;
          }
        }
        
        // Combine textDecoration
        let combinedTextDecoration = element.textDecoration || '';
        if (segment.textDecoration) {
          if (combinedTextDecoration && combinedTextDecoration !== segment.textDecoration) {
            combinedTextDecoration = `${segment.textDecoration} ${combinedTextDecoration}`;
          } else {
            combinedTextDecoration = segment.textDecoration;
          }
        }
        
        // Measure text width
        ctx.font = `${combinedFontStyle} ${element.fontSize}px ${element.fontFamily}`;
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        
        currentLine.push({
          text: line,
          fontStyle: combinedFontStyle,
          textDecoration: combinedTextDecoration,
          width: textWidth,
        });
        
        currentLineWidth += textWidth;
      }
    });
  });
  
  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push({
      segments: currentLine,
      width: currentLineWidth,
    });
  }
  
  // Now render text nodes with proper alignment
  const textNodes = [];
  let currentY = 0;
  
  lines.forEach((line, lineIndex) => {
    let startX = 0;
    
    // Calculate startX based on alignment
    const align = element.align || 'left';
    const containerWidth = element.width || line.width;
    
    if (align === 'center') {
      startX = (containerWidth - line.width) / 2;
    } else if (align === 'right') {
      startX = containerWidth - line.width;
    }
    
    let currentX = startX;
    
    line.segments.forEach((segment) => {
      textNodes.push({
        text: segment.text,
        x: currentX,
        y: currentY,
        fontStyle: segment.fontStyle,
        textDecoration: segment.textDecoration,
      });
      
      currentX += segment.width;
    });
    
    currentY += element.fontSize * (element.lineHeight || 1.15);
  });
  
  return (
    <>
      {textNodes.map((node, index) => (
        <Text
          key={`${element.id}-segment-${index}`}
          ref={index === 0 ? shapeRef : null}
          text={node.text}
          x={element.x + node.x}
          y={element.y + node.y}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={node.fontStyle}
          textDecoration={node.textDecoration}
          fill={element.fill}
          lineHeight={element.lineHeight || 1.15}
          draggable={index === 0}
          onClick={index === 0 ? (e) => { onSelect(); } : undefined}
          onDblClick={index === 0 ? onDoubleClick : undefined}
          onTap={index === 0 ? onSelect : undefined}
          onDragEnd={index === 0 ? (e) => {
            onChange({
              ...element,
              x: e.target.x(),
              y: e.target.y(),
            });
          } : undefined}
        />
      ))}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Component for editable image element
function EditableImage({ element, isSelected, onSelect, onChange }) {
  const [image] = useImage(element.src);
  const shapeRef = useRef();
  const trRef = useRef();
  const [dimensions, setDimensions] = useState({
    width: element.width,
    height: element.height,
  });

  // Auto-fit image to background width on load
  useEffect(() => {
    if (image && !element.fitted) {
      const bgWidth = 3508;
      const bgHeight = 2480;
      const imgWidth = image.width;
      const imgHeight = image.height;

      // Calculate aspect ratio
      const aspectRatio = imgWidth / imgHeight;

      // Fit to 80% of background width
      let newWidth = bgWidth * 0.8;
      let newHeight = newWidth / aspectRatio;

      // If height exceeds background, fit by height instead
      if (newHeight > bgHeight * 0.8) {
        newHeight = bgHeight * 0.8;
        newWidth = newHeight * aspectRatio;
      }

      // Center the image
      const newX = (bgWidth - newWidth) / 2;
      const newY = (bgHeight - newHeight) / 2;

      setDimensions({ width: newWidth, height: newHeight });
      onChange({
        ...element,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        fitted: true,
      });
    } else if (element.width && element.height) {
      setDimensions({ width: element.width, height: element.height });
    }
  }, [image]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={element.x}
        y={element.y}
        width={dimensions.width}
        height={dimensions.height}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const newWidth = Math.max(5, node.width() * scaleX);
          const newHeight = Math.max(5, node.height() * scaleY);

          setDimensions({ width: newWidth, height: newHeight });
          onChange({
            ...element,
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: newHeight,
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Component for background image
function BackgroundImage({ imageUrl }) {
  const [image] = useImage(imageUrl);
  const [dimensions, setDimensions] = useState({
    width: 973.6,
    height: 688.8,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (image) {
      const canvasWidth = 973.6;
      const canvasHeight = 688.8;
      const imgWidth = image.width;
      const imgHeight = image.height;

      // Calculate aspect ratios
      const canvasRatio = canvasWidth / canvasHeight;
      const imgRatio = imgWidth / imgHeight;

      let finalWidth, finalHeight, x, y;

      // Cover mode: fill entire canvas, crop if necessary
      if (imgRatio > canvasRatio) {
        // Image is wider than canvas ratio
        finalHeight = canvasHeight;
        finalWidth = finalHeight * imgRatio;
        x = (canvasWidth - finalWidth) / 2;
        y = 0;
      } else {
        // Image is taller than canvas ratio
        finalWidth = canvasWidth;
        finalHeight = finalWidth / imgRatio;
        x = 0;
        y = (canvasHeight - finalHeight) / 2;
      }

      setDimensions({
        width: finalWidth,
        height: finalHeight,
        x,
        y,
      });
    }
  }, [image]);

  // A4 landscape at 100% scale - fit to canvas with cover mode
  return (
    <KonvaImage
      image={image}
      x={dimensions.x}
      y={dimensions.y}
      width={dimensions.width}
      height={dimensions.height}
      listening={false}
    />
  );
}

export default function CertificateEditor({
  initialDesign = null,
  backgroundUrl = null,
  onSave,
  onBackgroundChange,
  kegiatanData = {},
}) {
  const [design, setDesign] = useState(
    initialDesign || DEFAULT_CERTIFICATE_DESIGN,
  );
  const [selectedId, setSelectedId] = useState(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    backgroundUrl ||
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/bg_Sertifikat.png`,
  );
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [clipboard, setClipboard] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingTextPosition, setEditingTextPosition] = useState({
    x: 0,
    y: 0,
  });
  const stageRef = useRef();
  const textareaRef = useRef();
  const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

  // A4 paper size in centimeters (landscape: 29.7 x 21 cm).
  // Convert to pixels for a typical print DPI (300 DPI) so exported/preview sizes match print dimensions.
  const A4_CM = { width: 29.7, height: 21 };
  const PRINT_DPI = 300; // pixels per inch for print-quality output
  const A4_PX = {
    width: Math.round((A4_CM.width / 2.54) * PRINT_DPI),
    height: Math.round((A4_CM.height / 2.54) * PRINT_DPI),
  };

  // Function to replace template variables with actual data for preview
  const replaceTemplateVariables = (text) => {
    if (!text || typeof text !== "string") return text;

    let result = text;

    // Replace variables with actual data from form
    if (kegiatanData.nama_kegiatan) {
      result = result.replace(/{{nama_kegiatan}}/g, kegiatanData.nama_kegiatan);
    }
    if (kegiatanData.judul) {
      result = result.replace(/{{judul_kegiatan}}/g, kegiatanData.judul);
      result = result.replace(/{{judul}}/g, kegiatanData.judul);
    }
    if (kegiatanData.tanggal) {
      // Format tanggal if needed
      const date = new Date(kegiatanData.tanggal);
      const options = { year: "numeric", month: "long", day: "numeric" };
      const formattedDate = date.toLocaleDateString("id-ID", options);
      result = result.replace(/{{tanggal}}/g, formattedDate);
    }
    if (kegiatanData.tempat) {
      result = result.replace(/{{tempat}}/g, kegiatanData.tempat);
    }

    return result;
  };

  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [galleryMode, setGalleryMode] = useState("element"); // 'element' or 'background'
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (initialDesign) {
      setDesign(initialDesign);
    }
  }, [initialDesign]);

  // Keep displayed background in sync with either the explicit
  // `backgroundUrl` prop (preferred) or the `design.background` path.
  // This ensures changing/saving background updates preview immediately
  // without requiring a hard refresh.
  useEffect(() => {
    if (backgroundUrl) {
      setBackgroundImageUrl(getBannerUrl(backgroundUrl));
      return;
    }

    if (design && design.background) {
      setBackgroundImageUrl(getBannerUrl(design.background));
    }
  }, [backgroundUrl, design && design.background]);

  useEffect(() => {
    if (backgroundUrl) {
      setBackgroundImageUrl(getBannerUrl(backgroundUrl));
    }
  }, [backgroundUrl]);

  // Debounced auto-save: save 3 seconds after last change
  useEffect(() => {
    if (!onSave || !design) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for 3 seconds
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      onSave(design);
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 500);
    }, 10_000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [design, onSave]);

  // Function to trigger save (can be called from anywhere)
  const triggerSave = (designToSave = design) => {
    if (onSave && designToSave) {
      setIsSaving(true);
      onSave(designToSave);
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Keyboard shortcut: Ctrl+S to save immediately
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        triggerSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [design, onSave]);

  const getBannerUrl = (banner) => {
    if (!banner) return null;
    // If already a full URL, return as is
    if (banner.startsWith("http")) {
      // Add cache busting timestamp
      const separator = banner.includes("?") ? "&" : "?";
      return `${banner}${separator}t=${Date.now()}`;
    }

    if (banner === "bg_Sertifikat.png") {
      return `${BE_URL}/bg_Sertifikat.png?t=${Date.now()}`;
    }

    // Otherwise, prepend BE_URL with cache busting
    return `${BE_URL}/storage/${banner}?t=${Date.now()}`;
  };

  // Save to history for undo/redo
  const saveToHistory = (newDesign) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(JSON.parse(JSON.stringify(newDesign)));
      // Limit history to 50 steps
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryStep((prev) => Math.min(prev + 1, 49));
  };

  const handleElementChange = (id, newAttrs) => {
    const newDesign = {
      ...design,
      elements: design.elements.map((el) =>
        el.id === id ? { ...el, ...newAttrs } : el,
      ),
    };
    setDesign(newDesign);
    saveToHistory(newDesign);

    // Auto-save to parent
    if (onSave) {
      onSave(newDesign);
    }
  };

  const handleTextContentChange = (id, value) => {
    const newDesign = {
      ...design,
      elements: design.elements.map((el) =>
        el.id === id ? { ...el, value } : el,
      ),
    };
    setDesign(newDesign);
    saveToHistory(newDesign);

    // Auto-save to parent
    if (onSave) {
      onSave(newDesign);
    }
  };

  const handleTextDoubleClick = (element) => {
    setEditingTextId(element.id);
    setEditingTextValue(element.value);
    const stage = stageRef.current;
    const textNode = stage.findOne(`#${element.id}`);
    if (textNode) {
      const transform = textNode.getAbsoluteTransform();
      const pos = transform.point({ x: element.x, y: element.y });
      setEditingTextPosition({
        x: pos.x * scale,
        y: pos.y * scale,
      });
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleInlineTextChange = (e) => {
    setEditingTextValue(e.target.value);
  };

  const handleInlineTextSubmit = () => {
    if (editingTextId) {
      handleTextContentChange(editingTextId, editingTextValue);
      setEditingTextId(null);
      setEditingTextValue("");
    }
  };

  const handleInlineTextBlur = () => {
    handleInlineTextSubmit();
  };

  const handleInlineTextKeyDown = (e) => {
    if (e.key === "Escape") {
      setEditingTextId(null);
      setEditingTextValue("");
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleInlineTextSubmit();
    }
  };

  const handleAddText = () => {
    const newElement = {
      id: `text_${Date.now()}`,
      type: "text",
      value: "Text Baru",
      x: 100,
      y: 100,
      fontSize: 32,
      fontFamily: "Arial",
      fill: "#000000",
      fontStyle: "normal",
      align: "left",
      width: 400,
      listening: true,
    };
    const newDesign = {
      ...design,
      elements: [...design.elements, newElement],
    };

    setDesign(newDesign);
    setSelectedId(newElement.id);

    // Auto-save to parent
    if (onSave) {
      onSave(newDesign);
    }
  };

  const handleAddImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", "certificates/images");

      const result = await uploadMedia(formData);
      if (result.success) {
        const newElement = {
          id: `image_${Date.now()}`,
          type: "image",
          src: result.data.url,
          path: result.data.path,
          x: 300,
          y: 200,
          width: 200,
          height: 200,
          fitted: false,
        };
        const newDesign = {
          ...design,
          elements: [...design.elements, newElement],
        };
        setDesign(newDesign);
        setSelectedId(newElement.id);

        // Auto-save to parent
        if (onSave) {
          onSave(newDesign);
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal mengupload gambar",
        text: String(
          error?.message || "Terjadi kesalahan saat mengupload gambar.",
        ),
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handleOpenImageGallery = async (mode = "element") => {
    setGalleryMode(mode);
    setShowImageGallery(true);
    setLoadingImages(true);
    try {
      // Fetch both images and backgrounds
      const [imagesResponse, backgroundsResponse] = await Promise.all([
        getMediaFiles("certificates/images").catch(() => ({ data: [] })),
        getMediaFiles("certificates/backgrounds").catch(() => ({ data: [] })),
      ]);

      const images = (imagesResponse.data || imagesResponse || []).map(
        (img) => ({
          ...img,
          type: "image",
        }),
      );
      const backgrounds = (
        backgroundsResponse.data ||
        backgroundsResponse ||
        []
      ).map((bg) => ({
        ...bg,
        type: "background",
      }));

      setUploadedImages([...images, ...backgrounds]);
    } catch (error) {
      console.error("Error fetching images:", error);
      setUploadedImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleSelectImageFromGallery = (imageData, mode) => {
    // Use passed mode parameter or fallback to state
    const actualMode = mode || galleryMode;
    if (actualMode === "background") {
      // Replace background
      const newBgUrl = getBannerUrl(imageData.path);
      setBackgroundImageUrl(newBgUrl);
      const newDesign = {
        ...design,
        background: imageData.path,
      };
      setDesign(newDesign);
      if (onBackgroundChange) {
        onBackgroundChange(imageData.path, newBgUrl);
      }
      // Trigger save immediately
      triggerSave(newDesign);
    } else {
      // Add as element
      const newElement = {
        id: `image_${Date.now()}`,
        type: "image",
        src: imageData.url,
        path: imageData.path,
        x: 300,
        y: 200,
        width: 200,
        height: 200,
        fitted: false,
      };
      const newDesign = {
        ...design,
        elements: [...design.elements, newElement],
      };
      setDesign(newDesign);
      setSelectedId(newElement.id);
      if (onSave) {
        onSave(newDesign);
      }
    }
    setShowImageGallery(false);
  };

  const handleDeleteImageFromGallery = async (e, imageData) => {
    e.stopPropagation(); // Prevent selecting the image

    const confirmRes = await Swal.fire({
      title: `Hapus gambar "${imageData.name || imageData.path}"?`,
      text: "Tindakan ini akan menghapus file dari server.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
    });
    if (!confirmRes.isConfirmed) {
      return;
    }

    try {
      await deleteMediaFile(imageData.path);
      // Refresh the gallery
      const [imagesResponse, backgroundsResponse] = await Promise.all([
        getMediaFiles("certificates/images").catch(() => ({ data: [] })),
        getMediaFiles("certificates/backgrounds").catch(() => ({ data: [] })),
      ]);

      const images = (imagesResponse.data || imagesResponse || []).map(
        (img) => ({
          ...img,
          type: "image",
        }),
      );
      const backgrounds = (
        backgroundsResponse.data ||
        backgroundsResponse ||
        []
      ).map((bg) => ({
        ...bg,
        type: "background",
      }));

      setUploadedImages([...images, ...backgrounds]);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal menghapus gambar",
        text: String(
          error?.message || "Terjadi kesalahan saat menghapus gambar.",
        ),
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handleDeleteElement = async (id) => {
    const newDesign = {
      ...design,
      elements: design.elements.filter((el) => el.id !== id),
    };
    setDesign(newDesign);
    saveToHistory(newDesign);
    setSelectedId(null);

    // Auto-save to parent
    if (onSave) {
      onSave(newDesign);
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBackground(true);
    try {
      // Delete old background if it exists and is not the default
      const oldBgPath = design.background;
      if (
        oldBgPath &&
        oldBgPath !== "bg_Sertifikat.png" &&
        (oldBgPath.startsWith("certificates/backgrounds/") ||
          oldBgPath.startsWith("certificates/"))
      ) {
        try {
          await deleteMediaFile(oldBgPath);
        } catch (err) {
          console.warn("Could not delete old background:", err);
          // Continue with upload even if deletion fails
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", "certificates/backgrounds/");

      const result = await uploadMedia(formData);
      if (result.success) {
        const newBgUrl = getBannerUrl(result.data.path);
        setBackgroundImageUrl(newBgUrl);
        const newDesign = {
          ...design,
          background: result.data.path,
        };
        setDesign(newDesign);
        if (onBackgroundChange) {
          onBackgroundChange(result.data.path, newBgUrl);
        }
        // Trigger save immediately
        triggerSave(newDesign);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal mengupload background",
        text: String(
          error?.message || "Terjadi kesalahan saat mengupload background.",
        ),
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleUseDefaultBackground = () => {
    const defaultBgUrl = getBannerUrl("bg_Sertifikat.png");
    setBackgroundImageUrl(defaultBgUrl);
    const newDesign = {
      ...design,
      background: "bg_Sertifikat.png",
    };
    setDesign(newDesign);
    if (onBackgroundChange) {
      onBackgroundChange("bg_Sertifikat.png", defaultBgUrl);
    }
    // Trigger save immediately
    triggerSave(newDesign);
  };

  const handleUseDefaultDesign = () => {
    setDesign(DEFAULT_CERTIFICATE_DESIGN);
    setSelectedId(null);
    // Trigger save immediately
    triggerSave(DEFAULT_CERTIFICATE_DESIGN);
  };

  const handleMoveUp = () => {
    if (!selectedId) return;
    const elements = [...design.elements];
    const index = elements.findIndex((el) => el.id === selectedId);
    if (index < elements.length - 1) {
      [elements[index], elements[index + 1]] = [
        elements[index + 1],
        elements[index],
      ];
      const newDesign = { ...design, elements };
      setDesign(newDesign);
      saveToHistory(newDesign);

      // Auto-save to parent
      if (onSave) {
        onSave(newDesign);
      }
    }
  };

  const handleMoveDown = () => {
    if (!selectedId) return;
    const elements = [...design.elements];
    const index = elements.findIndex((el) => el.id === selectedId);
    if (index > 0) {
      [elements[index], elements[index - 1]] = [
        elements[index - 1],
        elements[index],
      ];
      const newDesign = { ...design, elements };
      setDesign(newDesign);
      saveToHistory(newDesign);

      // Auto-save to parent
      if (onSave) {
        onSave(newDesign);
      }
    }
  };

  const handleDuplicate = () => {
    if (!selectedId) return;
    const element = design.elements.find((el) => el.id === selectedId);
    if (element) {
      const newElement = {
        ...element,
        id: `${element.type}_${Date.now()}`,
        x: element.x + 20,
        y: element.y + 20,
      };
      const newDesign = {
        ...design,
        elements: [...design.elements, newElement],
      };
      setDesign(newDesign);
      saveToHistory(newDesign);
      setSelectedId(newElement.id);

      // Auto-save to parent
      if (onSave) {
        onSave(newDesign);
      }
    }
  };

  const handleCopy = () => {
    if (!selectedId) return;
    const element = design.elements.find((el) => el.id === selectedId);
    if (element) {
      setClipboard(JSON.parse(JSON.stringify(element)));
    }
  };

  const handlePaste = () => {
    if (!clipboard) return;
    const newElement = {
      ...clipboard,
      id: `${clipboard.type}_${Date.now()}`,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
    };
    const newDesign = {
      ...design,
      elements: [...design.elements, newElement],
    };
    setDesign(newDesign);
    saveToHistory(newDesign);
    setSelectedId(newElement.id);

    // Auto-save to parent
    if (onSave) {
      onSave(newDesign);
    }
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      setDesign(JSON.parse(JSON.stringify(history[newStep])));
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      setDesign(JSON.parse(JSON.stringify(history[newStep])));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedId) return;

    const newDesign = {
      ...design,
      elements: design.elements.filter((el) => el.id !== selectedId),
    };
    setDesign(newDesign);
    saveToHistory(newDesign);
    setSelectedId(null);

    // Auto-save to parent
    if (onSave) {
      onSave(newDesign);
    }
  };

  const handleMoveElement = (direction, distance = 10) => {
    if (!selectedId) return;
    const element = design.elements.find((el) => el.id === selectedId);
    if (!element) return;

    let newX = element.x;
    let newY = element.y;

    switch (direction) {
      case "up":
        newY -= distance;
        break;
      case "down":
        newY += distance;
        break;
      case "left":
        newX -= distance;
        break;
      case "right":
        newX += distance;
        break;
    }

    handleElementChange(selectedId, { x: newX, y: newY });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + C: Copy
      if (modifier && e.key === "c") {
        e.preventDefault();
        handleCopy();
      }
      // Ctrl/Cmd + V: Paste
      else if (modifier && e.key === "v") {
        e.preventDefault();
        handlePaste();
      }
      // Ctrl/Cmd + Z: Undo
      else if (modifier && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      else if (
        (modifier && e.shiftKey && e.key === "z") ||
        (modifier && e.key === "y")
      ) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + D: Duplicate
      else if (modifier && e.key === "d") {
        e.preventDefault();
        handleDuplicate();
      }
      // Delete or Backspace: Delete selected
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        handleDeleteSelected();
      }
      // Arrow keys: Move element
      else if (e.key.startsWith("Arrow") && selectedId) {
        e.preventDefault();
        const distance = e.shiftKey ? 1 : 10; // Fine control with Shift
        if (e.key === "ArrowUp") handleMoveElement("up", distance);
        else if (e.key === "ArrowDown") handleMoveElement("down", distance);
        else if (e.key === "ArrowLeft") handleMoveElement("left", distance);
        else if (e.key === "ArrowRight") handleMoveElement("right", distance);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, design, clipboard, history, historyStep]);

  const selectedElement = design.elements.find((el) => el.id === selectedId);

  // Center guide calculations
  const canvasCenter = { x: design.width / 2, y: design.height / 2 };
  const alignThreshold = 6; // pixels tolerance for "centered"
  let guideAlignedX = false;
  let guideAlignedY = false;
  if (selectedElement) {
    const elCenterX =
      (selectedElement.x || 0) +
      (selectedElement.width ? selectedElement.width / 2 : 0);
    const elCenterY =
      (selectedElement.y || 0) +
      (selectedElement.height ? selectedElement.height / 2 : 0);
    guideAlignedX = Math.abs(elCenterX - canvasCenter.x) <= alignThreshold;
    guideAlignedY = Math.abs(elCenterY - canvasCenter.y) <= alignThreshold;
  }

  return (
    <div className="space-y-4">
      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
        <p className="text-sm">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
          Silahkan unggah template sertifikat, jika tidak maka akan menggunakan
          template default
        </p>
        <p className="text-sm mt-2">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
          <strong>Tips:</strong> Untuk format sebagian teks, gunakan: **bold**, *italic*, __underline__
        </p>
      </div>

      {/* Background Upload */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Background Sertifikat
        </label>
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faCloudUploadAlt} />
            {uploadingBackground ? "Uploading..." : "Upload Background"}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleBackgroundUpload}
              disabled={uploadingBackground}
            />
          </label>

          <button
            type="button"
            onClick={() => handleOpenImageGallery("background")}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faImage} />
            Pilih dari Galeri
          </button>

          <button
            type="button"
            onClick={handleUseDefaultBackground}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faImage} />
            Gunakan Default Background
          </button>

          <button
            type="button"
            onClick={handleUseDefaultDesign}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faUndo} />
            Gunakan Default Desain
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            {/* Enhanced Menu Bar - 2 Rows */}
            {selectedElement && (
              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                <span className="text-sm font-medium text-gray-700 block mb-2">
                  {selectedElement.type === "text" ? "📝" : "🖼️"}{" "}
                  {selectedElement.type === "text" ? "Text" : "Image"} dipilih
                </span>

                {selectedElement.type === "text" && (
                  <>
                    {/* Row 1: Font size controls, Bold/Italic, Color picker, Layer controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Font Size with direct input */}
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-600 mr-1">
                          Size:
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            handleElementChange(selectedElement.id, {
                              fontSize: Math.max(
                                10,
                                selectedElement.fontSize - 2,
                              ),
                            })
                          }
                          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Perkecil font"
                        >
                          <FontAwesomeIcon icon={faMinus} size="xs" />
                        </button>
                        <input
                          type="number"
                          min="10"
                          max="200"
                          value={selectedElement.fontSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 10;
                            handleElementChange(selectedElement.id, {
                              fontSize: Math.max(10, Math.min(200, val)),
                            });
                          }}
                          className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleElementChange(selectedElement.id, {
                              fontSize: Math.min(
                                200,
                                selectedElement.fontSize + 2,
                              ),
                            })
                          }
                          className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Perbesar font"
                        >
                          <FontAwesomeIcon icon={faPlus} size="xs" />
                        </button>
                      </div>

                      {/* Bold/Italic/Underline buttons */}
                      <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleElementChange(selectedElement.id, {
                              fontStyle:
                                selectedElement.fontStyle === "bold"
                                  ? "normal"
                                  : "bold",
                            })
                          }
                          className={`px-3 py-1 rounded border ${selectedElement.fontStyle?.includes("bold") ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-700 border-gray-300"} hover:bg-gray-700 hover:text-white transition-colors`}
                          title="Bold"
                        >
                          <FontAwesomeIcon icon={faBold} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleElementChange(selectedElement.id, {
                              fontStyle:
                                selectedElement.fontStyle === "italic"
                                  ? "normal"
                                  : "italic",
                            })
                          }
                          className={`px-3 py-1 rounded border ${selectedElement.fontStyle?.includes("italic") ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-700 border-gray-300"} hover:bg-gray-700 hover:text-white transition-colors`}
                          title="Italic"
                        >
                          <FontAwesomeIcon icon={faItalic} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleElementChange(selectedElement.id, {
                              textDecoration:
                                selectedElement.textDecoration === "underline"
                                  ? ""
                                  : "underline",
                            })
                          }
                          className={`px-3 py-1 rounded border ${selectedElement.textDecoration === "underline" ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-700 border-gray-300"} hover:bg-gray-700 hover:text-white transition-colors`}
                          title="Underline"
                        >
                          <FontAwesomeIcon icon={faUnderline} />
                        </button>
                      </div>

                      {/* Color picker */}
                      <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                        <label className="text-xs text-gray-600">Color:</label>
                        <input
                          type="color"
                          value={selectedElement.fill}
                          onChange={(e) =>
                            handleElementChange(selectedElement.id, {
                              fill: e.target.value,
                            })
                          }
                          className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                          title="Warna teks"
                        />
                      </div>

                      {/* Layer controls */}
                      <div className="flex items-center gap-1 ml-auto border-l border-gray-300 pl-2">
                        <button
                          type="button"
                          onClick={handleMoveUp}
                          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Pindah ke atas (layer)"
                        >
                          <FontAwesomeIcon icon={faArrowUp} />
                        </button>
                        <button
                          type="button"
                          onClick={handleMoveDown}
                          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Pindah ke bawah (layer)"
                        >
                          <FontAwesomeIcon icon={faArrowDown} />
                        </button>
                        <button
                          type="button"
                          onClick={handleDuplicate}
                          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                          title="Duplikat elemen"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteElement(selectedElement.id)
                          }
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Hapus elemen"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Font selector, Style dropdown, Align dropdown, Line spacing input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-9 gap-4 items-center">
                      {/* Font selector (larger) */}
                      <div className="flex items-center gap-1 col-span-1 lg:col-span-3 min-w-0">
                        <label className="text-xs text-gray-600 mr-1">Font:</label>
                        <div className="w-full min-w-0">
                          <SearchableSelect
                            value={selectedElement.fontFamily || "Arial"}
                            onChange={(e) =>
                              handleElementChange(selectedElement.id, {
                                fontFamily: e.target.value,
                              })
                            }
                            options={FONT_OPTIONS}
                            placeholder="Pilih font..."
                            name="fontFamily"
                          />
                        </div>
                      </div>

                      {/* Style dropdown */}
                      <div className="flex items-center gap-1 col-span-2 min-w-0">
                        <label className="text-xs text-gray-600 mr-1">Style:</label>
                        <div className="w-full min-w-0">
                          <SearchableSelect
                            value={selectedElement.fontStyle || "normal"}
                            onChange={(e) =>
                              handleElementChange(selectedElement.id, {
                                fontStyle: e.target.value,
                              })
                            }
                            options={STYLE_OPTIONS}
                            placeholder="Style..."
                            name="fontStyle"
                          />
                        </div>
                      </div>

                      {/* Align dropdown */}
                      <div className="flex items-center gap-1 col-span-2 min-w-0">
                        <label className="text-xs text-gray-600 mr-1">Align:</label>
                        <div className="w-full min-w-0">
                          <SearchableSelect
                            value={selectedElement.align || "left"}
                            onChange={(e) =>
                              handleElementChange(selectedElement.id, {
                                align: e.target.value,
                              })
                            }
                            options={ALIGN_OPTIONS}
                            placeholder="Align..."
                            name="align"
                          />
                        </div>
                      </div>

                      {/* Line spacing with direct input */}
                      <div className="flex items-center gap-1 col-span-1 min-w-0">
                        <label className="text-xs text-gray-600 mr-1">Spacing:</label>
                        <input
                          type="number"
                          min="0.5"
                          max="5.0"
                          step="0.1"
                          value={(selectedElement.lineHeight || 1.5).toFixed(1)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            handleElementChange(selectedElement.id, {
                              lineHeight: Math.max(0.5, Math.min(5.0, val)),
                            });
                          }}
                          className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Save Status Indicator */}
            {(isSaving || lastSaved) && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                {isSaving ? (
                  <div className="flex items-center gap-2 text-blue-600 text-sm">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Menyimpan desain...</span>
                  </div>
                ) : (
                  lastSaved && (
                    <div className="flex items-center gap-2 text-teal-500 text-sm">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-teal-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          Desain berhasil disimpan
                        </span>
                        <span className="text-xs text-gray-500">
                          Terakhir disimpan{" "}
                          {new Date(lastSaved).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Preview Sertifikat
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale(Math.max(0.3, scale - 0.1))}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setScale(Math.min(1.5, scale + 0.1))}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            </div>
            <div className="overflow-auto border border-gray-300 rounded relative">
              {editingTextId && (
                <textarea
                  ref={textareaRef}
                  value={editingTextValue}
                  onChange={handleInlineTextChange}
                  onBlur={handleInlineTextBlur}
                  onKeyDown={handleInlineTextKeyDown}
                  className="absolute z-50 px-2 py-1 border-2 border-blue-500 rounded bg-white shadow-md resize-none overflow-hidden"
                  style={{
                    left: `${editingTextPosition.x}px`,
                    top: `${editingTextPosition.y}px`,
                    minWidth: "200px",
                    minHeight: "60px",
                    fontSize: "14px",
                  }}
                  rows={3}
                />
              )}
              <Stage
                ref={stageRef}
                // A4 landscape at adjustable scale (base: 973.6x688.8px at 100%)
                width={973.6 * scale}
                height={688.8 * scale}
                scaleX={scale}
                scaleY={scale}
                onMouseDown={(e) => {
                  const clickedOnEmpty = e.target === e.target.getStage();
                  if (clickedOnEmpty) {
                    setSelectedId(null);
                  }
                }}
              >
                <Layer>
                  <BackgroundImage imageUrl={backgroundImageUrl} />
                  {design.elements.map((element, index) => {
                    return element.type === "text" ? (
                      <EditableText
                        key={element.id}
                        element={element}
                        isSelected={element.id === selectedId}
                        onSelect={() => setSelectedId(element.id)}
                        onChange={(newAttrs) =>
                          handleElementChange(element.id, newAttrs)
                        }
                        onDoubleClick={() => handleTextDoubleClick(element)}
                        previewText={replaceTemplateVariables(element.value)}
                      />
                    ) : (
                      <EditableImage
                        key={element.id}
                        element={element}
                        isSelected={element.id === selectedId}
                        onSelect={() => setSelectedId(element.id)}
                        onChange={(newAttrs) =>
                          handleElementChange(element.id, newAttrs)
                        }
                      />
                    );
                  })}
                </Layer>
                {/* Guide layer: center lines */}
                <Layer listening={false}>
                  <Line
                    points={[canvasCenter.x, 0, canvasCenter.x, design.height]}
                    stroke={guideAlignedX ? "#16a34a" : "#9ca3af"}
                    strokeWidth={2}
                    dash={[6, 4]}
                    opacity={0.9}
                  />
                  <Line
                    points={[0, canvasCenter.y, design.width, canvasCenter.y]}
                    stroke={guideAlignedY ? "#16a34a" : "#9ca3af"}
                    strokeWidth={2}
                    dash={[6, 4]}
                    opacity={0.9}
                  />
                </Layer>
              </Stage>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Add Elements */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Tambah Elemen
            </h3>
            <button
              type="button"
              onClick={handleAddText}
              className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors inline-flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faFont} />
              Tambah Teks
            </button>

            <label className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faCloudUploadAlt} />
              Upload Gambar Baru
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAddImage}
              />
            </label>

            <button
              type="button"
              onClick={() => handleOpenImageGallery("element")}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faImage} />
              Pilih dari Galeri
            </button>
          </div>

          {/* Element Editor */}
          {selectedElement && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Edit {selectedElement.type === "text" ? "Text" : "Gambar"}
              </h3>

              {selectedElement.type === "text" ? (
                <>
                  {/* Text Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text
                    </label>
                    <textarea
                      value={selectedElement.value}
                      onChange={(e) =>
                        handleTextContentChange(
                          selectedElement.id,
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Gunakan variabel: {`{{nomor_sertifikat}}`}, {`{{nama}}`}, {`{{peran}}`}, {`{{nama_kegiatan}}`}, {`{{judul_kegiatan}}`}, {`{{tanggal}}`}
                      <br />
                      💡 Variabel akan otomatis diganti dengan data dari form
                      saat preview.
                      <br />
                      💡{" "}
                      <strong>
                        Double-click text di canvas untuk edit langsung.
                      </strong>
                      <br />
                      ✨{" "}
                      <strong>
                        Format sebagian teks: **bold**, *italic*, __underline__
                      </strong>
                      <br />
                      Contoh: "Ini adalah **teks tebal** di kalimat"
                      <br />
                      HTML tags seperti <code>&lt;b&gt;</code>,{" "}
                      <code>&lt;i&gt;</code>, <code>&lt;br&gt;</code> akan
                      di-strip (hanya text yang ditampilkan). Gunakan kontrol
                      Style di bawah untuk styling.
                    </p>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ukuran Font
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={selectedElement.fontSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        handleElementChange(selectedElement.id, {
                          fontSize: Math.max(10, Math.min(200, val)),
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2"
                    />
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={selectedElement.fontSize}
                      onChange={(e) =>
                        handleElementChange(selectedElement.id, {
                          fontSize: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {selectedElement.fontSize}px
                    </div>
                  </div>

                  {/* Line Spacing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Spacing
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={(selectedElement.lineHeight || 1.5).toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.0;
                        handleElementChange(selectedElement.id, {
                          lineHeight: Math.max(0.5, Math.min(5.0, val)),
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2"
                    />
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={selectedElement.lineHeight || 1.5}
                      onChange={(e) =>
                        handleElementChange(selectedElement.id, {
                          lineHeight: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {(selectedElement.lineHeight || 1.5).toFixed(1)}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Font
                    </label>
                    <SearchableSelect
                      value={selectedElement.fontFamily || "Arial"}
                      onChange={(e) =>
                        handleElementChange(selectedElement.id, {
                          fontFamily: e.target.value,
                        })
                      }
                      options={FONT_OPTIONS}
                      placeholder="Pilih font..."
                      name="fontFamily"
                    />
                  </div>

                  {/* Font Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style
                    </label>
                    <SearchableSelect
                      value={selectedElement.fontStyle || "normal"}
                      onChange={(e) =>
                        handleElementChange(selectedElement.id, {
                          fontStyle: e.target.value,
                        })
                      }
                      options={STYLE_OPTIONS}
                      placeholder="Pilih style..."
                      name="fontStyle"
                    />
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warna Teks
                    </label>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) =>
                        handleElementChange(selectedElement.id, {
                          fill: e.target.value,
                        })
                      }
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>

                  {/* Text Align */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Align
                    </label>
                    <SearchableSelect
                      value={selectedElement.align || "left"}
                      onChange={(e) =>
                        handleElementChange(selectedElement.id, {
                          align: e.target.value,
                        })
                      }
                      options={ALIGN_OPTIONS}
                      placeholder="Pilih align..."
                      name="align"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Image Info */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <strong>Posisi X:</strong> {Math.round(selectedElement.x)}
                      px
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Posisi Y:</strong> {Math.round(selectedElement.y)}
                      px
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Lebar:</strong>{" "}
                      {Math.round(selectedElement.width)}px
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Tinggi:</strong>{" "}
                      {Math.round(selectedElement.height)}px
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 Drag untuk memindahkan, drag pojok untuk resize
                  </p>
                </>
              )}

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faTrash} />
                Hapus Elemen
              </button>
            </div>
          )}

          {/* Info - Auto Save */}
          <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-lg">
            <p className="text-sm">
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              Desain akan otomatis tersimpan saat submit form
            </p>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                <FontAwesomeIcon
                  icon={faImage}
                  className="mr-2 text-purple-600"
                />
                {galleryMode === "background"
                  ? "Pilih Background dari Galeri"
                  : "Pilih Gambar dari Galeri"}
              </h3>
              <button
                type="button"
                onClick={() => setShowImageGallery(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingImages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
                    <p className="text-gray-600">Memuat gambar...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Static Default Images */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={faImage}
                        className="text-purple-600"
                      />
                      Gambar Default
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        {
                          url: `${import.meta.env.VITE_API_BASE_URL}/logo-dpd.png`,
                          path: "logo-dpd.png",
                          name: "Logo DPD",
                        },
                        {
                          url: `${import.meta.env.VITE_API_BASE_URL}/berakhlak.png`,
                          path: "berakhlak.png",
                          name: "Berakhlak",
                        },
                        {
                          url: `${import.meta.env.VITE_API_BASE_URL}/cap-dpd.png`,
                          path: "cap-dpd.png",
                          name: "Cap DPD",
                        },
                        {
                          url: `${import.meta.env.VITE_API_BASE_URL}/ttd-okk.png`,
                          path: "ttd-okk.png",
                          name: "TTD OKK",
                        },
                        {
                          url: `${import.meta.env.VITE_API_BASE_URL}/bg_Sertifikat.png`,
                          path: "bg_Sertifikat.png",
                          name: "Background Sertifikat",
                          type: "background",
                        },
                      ].map((img, index) => (
                        <div
                          key={`default-${index}`}
                          onClick={() =>
                            handleSelectImageFromGallery(img, img.type)
                          }
                          className="relative group cursor-pointer border-2 border-purple-300 rounded-lg overflow-hidden hover:border-purple-600 transition-all hover:shadow-md"
                        >
                          <div className="aspect-square bg-gray-100 flex items-center justify-center">
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-contain p-2"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white text-purple-600 px-3 py-1.5 rounded-lg font-semibold text-sm">
                                <FontAwesomeIcon
                                  icon={faCheck}
                                  className="mr-1"
                                />
                                Pilih
                              </div>
                            </div>
                          </div>
                          {/* Type Badge */}
                          <div className="absolute top-2 left-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                img.type === "background"
                                  ? "bg-blue-500 text-white"
                                  : "bg-teal-500 text-white"
                              }`}
                            >
                              {img.type === "background"
                                ? "Background"
                                : "Image"}
                            </span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                            <p className="text-white text-xs truncate font-medium">
                              {img.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Uploaded Images */}
                  {uploadedImages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={faCloudUploadAlt}
                          className="text-blue-600"
                        />
                        Gambar yang Diupload
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {uploadedImages.map((img, index) => (
                          <div
                            key={index}
                            className="relative group border-2 border-gray-200 rounded-lg overflow-hidden hover:border-purple-500 transition-all hover:shadow-md"
                          >
                            <div
                              onClick={() =>
                                handleSelectImageFromGallery(img, img.type)
                              }
                              className="cursor-pointer"
                            >
                              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                <img
                                  src={img.url}
                                  alt={img.name || `Image ${index + 1}`}
                                  className="w-full h-full object-contain p-2"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold">
                                    <FontAwesomeIcon
                                      icon={faCheck}
                                      className="mr-2"
                                    />
                                    Pilih
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Type Badge */}
                            <div className="absolute top-2 left-2">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded ${
                                  img.type === "background"
                                    ? "bg-blue-500 text-white"
                                    : "bg-teal-500 text-white"
                                }`}
                              >
                                {img.type === "background"
                                  ? "Background"
                                  : "Image"}
                              </span>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={(e) =>
                                handleDeleteImageFromGallery(e, img)
                              }
                              type="button"
                              className="px-3 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                              title="Hapus gambar"
                            >
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="w-4 h-4"
                              />
                            </button>

                            {img.name && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                                <p className="text-white text-xs truncate">
                                  {img.name}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowImageGallery(false)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
