'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { podcastAPI, PodcastGeneration } from '@/lib/api';

interface PodcastPlayerProps {
  podcast: PodcastGeneration;
  reportId: string;
}

export function PodcastPlayer({ podcast, reportId }: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(podcast.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch authenticated audio and create blob URL
  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const blob = await podcastAPI.download(reportId);
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load audio:', err);
        setError('Failed to load audio file');
        setIsLoading(false);
      }
    };

    fetchAudio();

    // Cleanup blob URL on unmount
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [reportId]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await podcastAPI.download(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcast_${reportId.substring(0, 8)}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getAudioErrorMessage = (event: React.SyntheticEvent<HTMLAudioElement>): string => {
    const audioError = (event.target as HTMLAudioElement).error;
    if (!audioError) return 'Unknown playback error';

    switch (audioError.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return 'Playback was aborted';
      case MediaError.MEDIA_ERR_NETWORK:
        return 'Network error occurred';
      case MediaError.MEDIA_ERR_DECODE:
        return 'Audio decoding failed';
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'Audio format not supported';
      default:
        return 'Playback error occurred';
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setCanPlay(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  return (
    <div className="p-4 bg-white border border-meraki-gray-200 rounded-lg relative">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => {
          setIsLoading(false);
          setCanPlay(true);
        }}
        onCanPlayThrough={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={(e) => {
          setError(getAudioErrorMessage(e));
          setIsLoading(false);
          setCanPlay(false);
        }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || podcast.durationSeconds || 0)}
        onEnded={() => setIsPlaying(false)}
        onSeeking={() => setIsBuffering(true)}
        onSeeked={() => setIsBuffering(false)}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-meraki-blue animate-spin" />
            <span className="text-sm text-meraki-gray-600">Loading audio...</span>
          </div>
        </div>
      )}

      {/* Buffering indicator */}
      {isBuffering && !isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <Loader2 className="w-8 h-8 text-meraki-blue animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-meraki-gray-200 rounded-lg appearance-none cursor-pointer accent-meraki-blue"
        />
        <div className="flex justify-between text-xs text-meraki-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            disabled={!canPlay || isLoading || !!error}
            className="p-2 bg-meraki-blue text-white rounded-full hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          {/* Speed selector */}
          <select
            value={playbackRate}
            onChange={(e) => {
              const rate = parseFloat(e.target.value);
              setPlaybackRate(rate);
              if (audioRef.current) audioRef.current.playbackRate = rate;
            }}
            className="text-sm border border-meraki-gray-300 rounded px-2 py-1"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
          </select>

          {/* Mute toggle */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (audioRef.current) audioRef.current.muted = !isMuted;
            }}
            className="p-1 text-meraki-gray-500 hover:text-meraki-gray-700"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-meraki-gray-300 rounded hover:bg-meraki-gray-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Downloading...' : 'Download'}
        </button>
      </div>
    </div>
  );
}
