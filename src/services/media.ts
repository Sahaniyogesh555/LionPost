import { supabase } from '../lib/supabase'

const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_JPEG_BYTES = 8 * 1024 * 1024

function canvasJpeg(source: ImageBitmap, quality: number) {
  const ratio = source.width / source.height
  if (ratio < 4 / 5 || ratio > 1.91) throw new Error('Instagram photos must have an aspect ratio between 4:5 and 1.91:1. Crop this image and try again.')
  const width = Math.max(320, Math.min(1440, source.width))
  const height = Math.round(width / ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the photo for Instagram.')
  context.drawImage(source, 0, 0, width, height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This browser could not convert the photo to JPEG.')), 'image/jpeg', quality)
  })
}

async function instagramJpeg(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file for Instagram.')
  let source: ImageBitmap
  try {
    source = await createImageBitmap(file)
  } catch {
    throw new Error('This image could not be read. Choose a JPEG, PNG, or WebP photo.')
  }
  try {
    // Convert to the JPEG/sRGB-compatible form required by Instagram. A flat
    // image is intentional: animated images become their first frame.
    const blob = await canvasJpeg(source, 0.92)
    if (blob.size > MAX_JPEG_BYTES) throw new Error('The converted Instagram photo is larger than 8 MB. Choose a smaller image.')
    return blob
  } finally {
    source.close()
  }
}

export async function uploadInstagramMedia(file: File, userId: string, mediaType: 'image' | 'video') {
  if (!file.size) throw new Error('The selected media file is empty.')
  let blob: Blob = file
  let extension: string
  let contentType: string

  if (mediaType === 'image') {
    blob = await instagramJpeg(file)
    extension = 'jpg'
    contentType = 'image/jpeg'
  } else {
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) throw new Error('Instagram Reels require an MP4 or MOV video with H.264/HEVC video and AAC audio.')
    if (file.size > MAX_VIDEO_BYTES) throw new Error('Please choose an Instagram video smaller than 100 MB.')
    extension = file.type === 'video/quicktime' ? 'mov' : 'mp4'
    contentType = file.type
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('post-media').upload(path, blob, { contentType, cacheControl: '0', upsert: false })
  if (error) throw new Error(`The media could not be uploaded for Instagram: ${error.message}`)
  return { path, mediaType }
}
