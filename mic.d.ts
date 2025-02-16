declare module 'mic' {
    interface MicOptions {
        rate?: string;
        channels?: string;
        fileType?: string;
    }

    interface Mic {
        start: () => void;
        stop: () => void;
        getAudioStream: () => any;
    }

    function mic(options: MicOptions): Mic;
    export = mic;
} 