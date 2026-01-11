'use client';

import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff, Play, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (url: string) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        await uploadAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 15) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const uploadAudio = async (blob: Blob) => {
    try {
      const fileName = `voice-note-${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
        });

      if (error) {
        toast({
          title: 'Upload Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const { data: publicData } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(fileName);

      onRecordingComplete(publicData.publicUrl);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload voice note',
        variant: 'destructive',
      });
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    onRecordingComplete('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {!audioUrl ? (
          <>
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'outline'}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className="flex-1"
            >
              {isRecording ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Recording... {recordingTime}s
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Hold to Record (Max 15s)
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <audio controls src={audioUrl} className="flex-1" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={deleteRecording}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Optional: Record delivery instructions for the restaurant
      </p>
    </div>
  );
}
