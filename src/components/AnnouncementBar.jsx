import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnnouncementBar() {
    const [settings, setSettings] = useState({ text: '', enabled: false });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "siteSettings", "announcement"), (doc) => {
            if (doc.exists()) {
                setSettings(doc.data());
            }
        });
        return () => unsub();
    }, []);

    return (
        <AnimatePresence>
            {settings.enabled && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#1C3C85] text-white overflow-hidden relative border-b border-white/10"
                >
                    {/* Container with relative positioning */}
                    <div className="py-2 flex whitespace-nowrap overflow-hidden relative">
                        <motion.div
                            initial={{ x: 0 }} 
                            animate={{ x: "-50%" }} // Move exactly half-way (one full set of text)
                            transition={{
                                repeat: Infinity,
                                duration: 12,        // SLOWER: 25 seconds for a full loop
                                ease: "linear",
                            }}
                            className="flex"
                        >
                            {/* We repeat the text many times here so there is never a gap */}
                            <span className="text-[10px] md:text-xs font-archivo font-bold uppercase tracking-[0.2em] px-10">
                                {settings.text}
                            </span>
                            <span className="text-[10px] md:text-xs font-archivo font-bold uppercase tracking-[0.2em] px-10">
                                {settings.text}
                            </span>
                            <span className="text-[10px] md:text-xs font-archivo font-bold uppercase tracking-[0.2em] px-10">
                                {settings.text}
                            </span>
                            <span className="text-[10px] md:text-xs font-archivo font-bold uppercase tracking-[0.2em] px-10">
                                {settings.text}
                            </span>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}