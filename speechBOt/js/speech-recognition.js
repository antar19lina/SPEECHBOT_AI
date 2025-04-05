/**
 * Speech Recognition Module
 * Handles the Web Speech API integration for real-time speech-to-text
 */

class SpeechRecognitionManager {
    constructor() {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition not supported in this browser');
            return;
        }

        // Initialize Speech Recognition
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        // State variables
        this.isRecording = false;
        this.transcriptText = '';
        this.startTime = null;
        this.wordCount = 0;
        this.fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of', 'kind of'];
        this.fillerWordCount = 0;
        this.uniqueWords = new Set();
        
        // Event callbacks
        this.onTranscriptUpdate = null;
        this.onAnalyticsUpdate = null;
        
        // Configure event listeners
        this._setupEventListeners();
    }

    _setupEventListeners() {
        // Handle results from speech recognition
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    this._processTranscript(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update transcript with final and interim results
            this.transcriptText = finalTranscript;
            
            if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate(finalTranscript, interimTranscript);
            }
        };

        // Handle errors in speech recognition
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stop();
        };

        // Handle end of recognition session
        this.recognition.onend = () => {
            if (this.isRecording) {
                // If recording was not intentionally stopped, restart
                this.recognition.start();
            } else {
                // Calculate final metrics
                const duration = (Date.now() - this.startTime) / 1000 / 60; // in minutes
                const wpm = Math.round(this.wordCount / duration);
                
                const analytics = {
                    fillerWordCount: this.fillerWordCount,
                    vocabularyDiversity: this.uniqueWords.size / this.wordCount || 0,
                    wpm: wpm,
                    duration: Math.round(duration * 60) // in seconds
                };
                
                if (this.onAnalyticsUpdate) {
                    this.onAnalyticsUpdate(analytics, true);
                }
            }
        };
    }

    _processTranscript(transcript) {
        // Clean the transcript
        const words = transcript.trim().toLowerCase().split(/\s+/);
        
        // Count words
        this.wordCount += words.length;
        
        // Track unique words for vocabulary diversity
        words.forEach(word => {
            // Remove punctuation
            const cleanWord = word.replace(/[^\w\s]|_/g, "");
            if (cleanWord.length > 0) {
                this.uniqueWords.add(cleanWord);
            }
        });
        
        // Count filler words
        this.fillerWords.forEach(fillerWord => {
            const regex = new RegExp('\\b' + fillerWord + '\\b', 'gi');
            const matches = transcript.match(regex);
            if (matches) {
                this.fillerWordCount += matches.length;
            }
        });
        
        // Calculate speaking pace
        if (this.startTime) {
            const duration = (Date.now() - this.startTime) / 1000 / 60; // in minutes
            const wpm = Math.round(this.wordCount / duration);
            
            const analytics = {
                fillerWordCount: this.fillerWordCount,
                vocabularyDiversity: this.uniqueWords.size / this.wordCount || 0,
                wpm: wpm,
                duration: Math.round(duration * 60) // in seconds
            };
            
            if (this.onAnalyticsUpdate) {
                this.onAnalyticsUpdate(analytics, false);
            }
        }
    }

    start() {
        if (!this.recognition) return;
        
        try {
            this.isRecording = true;
            this.recognition.start();
            this.startTime = Date.now();
            
            // Reset analytics
            this.wordCount = 0;
            this.fillerWordCount = 0;
            this.uniqueWords = new Set();
            
            console.log('Speech recognition started');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    }

    stop() {
        if (!this.recognition) return;
        
        try {
            this.isRecording = false;
            this.recognition.stop();
            console.log('Speech recognition stopped');
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }

    setTranscriptUpdateCallback(callback) {
        this.onTranscriptUpdate = callback;
    }

    setAnalyticsUpdateCallback(callback) {
        this.onAnalyticsUpdate = callback;
    }

    getTranscript() {
        return this.transcriptText;
    }

    isListening() {
        return this.isRecording;
    }
}

// Export the module
const speechRecognition = new SpeechRecognitionManager(); 