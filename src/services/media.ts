import { supabase } from '../lib/supabase'

const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_JPEG_BYTES = 8 * 1024 * 1024

function canvasJpeg(source: ImageBitmap, quality: number, instagram: boolean) {
  const ratio = source.width / source.height
  if (instagram && (ratio < 4 / 5 || ratio > 1.91)) throw new Error('Instagram photos must have an aspect ratio between 4:5 and 1.91:1. Crop this image and try again.')
  let width: number
  let height: number
  if (instagram) {
    width = Math.max(320, Math.min(1440, source.width))
    height = Math.round(width / ratio)
  } else {
    const scale = Math.min(1, 1440 / source.width, 1440 / source.height)
    width = Math.max(1, Math.round(source.width * scale))
    height = Math.max(1, Math.round(source.height * scale))
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the photo.')
  context.drawImage(source, 0, 0, width, height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This browser could not convert the photo to JPEG.')), 'image/jpeg', quality)
  })
}

async function prepareJpeg(file: File, instagram: boolean) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  let source: ImageBitmap
  try {
    source = await createImageBitmap(file)
  } catch {
    throw new Error('This image could not be read. Choose a JPEG, PNG, or WebP photo.')
  }
  try {
    // A flat JPEG works across Meta, Pinterest, and TikTok photo publishing.
    // Animated images intentionally become their first frame.
    const blob = await canvasJpeg(source, 0.92, instagram)
    if (blob.size > MAX_JPEG_BYTES) throw new Error('The converted photo is larger than 8 MB. Choose a smaller image.')
    return blob
  } finally {
    source.close()
  }
}

export async function uploadPostMedia(file: File, userId: string, mediaType: 'image' | 'video', options: { instagram?: boolean } = {}) {
  if (!file.size) throw new Error('The selected media file is empty.')
  let blob: Blob = file
  let extension: string
  let contentType: string

  if (mediaType === 'image') {
    blob = await prepareJpeg(file, Boolean(options.instagram))
    extension = 'jpg'
    contentType = 'image/jpeg'
  } else {
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) throw new Error('Connected video publishing accepts MP4 or MOV files. Facebook additionally requires MP4.')
    if (file.size > MAX_VIDEO_BYTES) throw new Error('Please choose a video smaller than 100 MB.')
    extension = file.type === 'video/quicktime' ? 'mov' : 'mp4'
    contentType = file.type
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('post-media').upload(path, blob, { contentType, cacheControl: '0', upsert: false })
  if (error) throw new Error(`The media could not be uploaded: ${error.message}`)
  return { path, mediaType }
}

export function uploadInstagramMedia(file: File, userId: string, mediaType: 'image' | 'video') {
  return uploadPostMedia(file, userId, mediaType, { instagram: true })
}
