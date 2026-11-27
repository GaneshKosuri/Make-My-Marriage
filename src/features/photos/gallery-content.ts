/**
 * Copy for the gallery screens (PRD §9.20–9.23). Kept in one place so the
 * screens and their tests agree. Layout follows the Stitch screens; wording
 * and colours follow the docs and brand tokens (decided 2026-11-20).
 */

export const GALLERY_ROUTES = {
  gallery: "/app/photos",
  qr: "/app/photos/qr",
} as const;

/** The "Wedding Memories" album: photos without an event (PRD §9.21). */
export const MEMORIES_ALBUM = "other";

const count = (n: number, one: string, many: string) =>
  `${new Intl.NumberFormat("en-IN").format(n)} ${n === 1 ? one : many}`;

export const GALLERY = {
  eyebrow: "Photos",
  title: "Gallery",
  description: "Every photo from the family and your guests, in one private place.",
  qr: "QR code",
  upload: "Upload photos",
  banner: {
    photos: (n: number) => count(n, "photo", "photos"),
    share: "Share with guests",
  },
  albums: { label: "Albums", all: "All", memories: "Wedding Memories" },
  albumName: (name: string, archived: boolean) => (archived ? `${name} (archived)` : name),
  shown: (shown: number, total: number) =>
    `${new Intl.NumberFormat("en-IN").format(shown)} of ${new Intl.NumberFormat("en-IN").format(total)}`,
  loadMore: "Load more",
  loadingMore: "Loading…",
  guestTag: "Guest",
  open: (name: string) => `Open ${name}`,
  photoName: (filename: string | null) => filename ?? "Wedding photo",
  download: "Download",
  downloadLabel: (name: string) => `Download ${name}`,
  delete: "Delete",
  deleteLabel: (name: string) => `Delete ${name}`,
  downloadError: "We couldn't start the download. Try again.",
  deleted: "Photo deleted.",
  empty: {
    title: "No photos yet",
    description: "Upload your first photos, or share the QR code so guests can add theirs.",
  },
  emptyAlbum: (album: string) => `No ${album} photos yet`,
  emptyAlbumDescription: "Photos you upload to this album appear here.",
  loadError: { title: "We couldn't load the gallery.", retry: "Try again" },
  viewer: {
    label: "Photo viewer",
    close: "Close",
    previous: "Previous photo",
    next: "Next photo",
    byGuest: (date: string) => `Uploaded by a guest · ${date}`,
    byFamily: (date: string) => `Uploaded by the family · ${date}`,
  },
  confirmDelete: {
    title: "Delete this photo?",
    description: "It's removed for everyone, including guests. This can't be undone.",
    cancel: "Keep photo",
    confirm: "Delete photo",
    error: "We couldn't delete the photo. Try again.",
  },
} as const;

/** Upload copy shared by the family dialog and the guest sheet. */
export const UPLOAD = {
  title: "Upload photos",
  drop: "Drag photos here or choose from your computer",
  dropPhone: "Choose photos from your phone",
  choose: "Choose photos",
  hint: "JPEG, PNG or WebP · up to 10 MB each · 20 at a time",
  album: "Album",
  albumHint: "You can upload more to another album afterwards.",
  queue: (n: number) => count(n, "photo selected", "photos selected"),
  tooMany: "Choose up to 20 photos at a time. We kept the first 20.",
  remove: (name: string) => `Remove ${name}`,
  status: {
    waiting: "Waiting",
    uploading: "Uploading",
    done: "Uploaded",
    failed: "Couldn't upload",
  },
  invalid: {
    type: "Not a JPEG, PNG or WebP photo",
    size: "Larger than 10 MB",
    empty: "This file is empty",
  },
  retry: "Try again",
  retryLabel: (name: string) => `Try uploading ${name} again`,
  start: (n: number) => (n === 1 ? "Upload 1 photo" : `Upload ${n} photos`),
  uploading: "Uploading…",
  close: "Close",
  done: (n: number) => (n === 1 ? "1 photo uploaded." : `${n} photos uploaded.`),
  rateLimited: "That's a lot of photos for now. Please try again in a little while.",
  notAvailable: "The gallery is closed, or this album isn't available any more.",
} as const;

/** Copy for /app/photos/qr: the gallery switches, link and printable QR card (PRD §9.23). */
export const SHARE = {
  eyebrow: "Photos",
  title: "Share the gallery",
  description:
    "Guests scan the QR code or open the link to see and add photos. The link never changes, so printed cards keep working.",
  back: "Gallery",
  access: {
    title: "Gallery access",
    gallery: { label: "Gallery is on", hint: "Anyone with the link can see the photos." },
    uploads: { label: "Guests can upload", hint: "Guests can add photos without signing in." },
    uploadsNeedGallery: "Turn the gallery on first.",
    saveError: "We couldn't save that change. Try again.",
    galleryChanged: (on: boolean) => (on ? "The gallery is on." : "The gallery is off."),
    uploadsChanged: (on: boolean) =>
      on ? "Guests can now upload photos." : "Guest uploads are off.",
  },
  link: {
    label: "Gallery link",
    copy: "Copy link",
    copied: "Link copied",
    copyFailed: "Couldn't copy. Select the link and copy it instead.",
    whatsapp: "Share on WhatsApp",
  },
  whatsappMessage: (couple: string, url: string) =>
    `Share the memories 📸\n\nSee and add photos from ${couple}'s wedding: ${url}`,
  card: {
    heading: "Share the Memories 📸",
    scan: (couple: string) => `Scan to upload and view photos from ${couple}'s wedding`,
    qrLabel: (couple: string) => `QR code for ${couple}'s wedding gallery`,
  },
  off: {
    overlay: "Turn the gallery on to share it",
    note: "While the gallery is off, the link and QR code show “This gallery is closed”.",
  },
  downloadPng: "Download PNG",
  downloadSvg: "Download SVG",
  print: "Print card",
  fileName: "wedding-gallery-qr",
  loadError: { title: "We couldn't load the gallery settings.", retry: "Try again" },
} as const;

/** Copy for the guest gallery at /gallery/[token] (PRD §9.22). */
export const GUEST_GALLERY = {
  eyebrow: "Wedding gallery",
  add: "Add your photos",
  addHint: "Photos are shared with the family as they are.",
  uploadsOff: "The family has turned off uploads.",
  albumsLabel: "Albums",
  empty: {
    title: "No photos yet",
    description: "Be the first to add one!",
  },
  emptyAlbum: (album: string) => `No ${album} photos yet`,
  loadError: { title: "We couldn't load the photos.", retry: "Try again" },
  sheet: {
    title: "Add your photos",
    event: "Which event?",
    notSure: "Not sure",
    hint: "Up to 20 photos · JPEG, PNG or WebP · 10 MB each",
    start: (n: number) => (n === 1 ? "Upload 1 photo" : `Upload ${n} photos`),
  },
  success: {
    title: "Thank you!",
    description: (n: number) =>
      n === 1 ? "Your photo is in the gallery." : `Your ${n} photos are in the gallery.`,
    seeGallery: "See the gallery",
    addMore: "Add more photos",
  },
  closed: {
    title: "This gallery is closed",
    description: "Ask the family for a new link.",
  },
  unavailable: {
    title: "The gallery isn't available right now",
    description: "Please try again in a little while.",
    retry: "Try again",
  },
} as const;
