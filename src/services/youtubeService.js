export const extractYouTubeId = (text) => {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = text.match(regex);
  return match ? match[1] : null;
};

export const isYouTubeUrl = (text) => {
  return /(?:youtube\.com|youtu\.be)/.test(text);
};