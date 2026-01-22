import React, { useState, useEffect } from 'react';
import { Globe, Check, X, RotateCcw } from 'lucide-react';
import { Card, Button } from '../components/Shared';

const DATA = [
  { country: "Deutschland", capital: "Berlin" },
  { country: "Frankreich", capital: "Paris" },
  { country: "Italien", capital: "Rom" },
  { country: "Spanien", capital: "Madrid" },
  { country: "Österreich", capital: "Wien" },
  { country: "Schweiz", capital: "Bern" },
  { country: "Japan", capital: "Tokio" },
  { country: "USA", capital: "Washington D.C." },
  { country: "China", capital: "Peking" },
  { country: "Brasilien", capital: "Brasília" },
];

const Capitals: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);

  const handleNext = (correct: boolean) => {
    if (correct) setScore(s => s + 1);
    if (currentIdx < DATA.length - 1) {
      setCurrentIdx(i => i + 1);
      setShowAnswer(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="text-center py-20 animate-enter space-y-8">
        <h2 className="text-4xl font-bold">Ergebnis</h2>
        <div className="text-9xl font-black text-primary">{score} / {DATA.length}</div>
        <Button size="lg" onClick={() => { setFinished(false); setCurrentIdx(0); setScore(0); setShowAnswer(false); }}>
            <RotateCcw className="mr-2" /> Erneut spielen
        </Button>
      </div>
    );
  }

  const current = DATA[currentIdx];

  return (
    <div className="space-y-8 animate-enter max-w-lg mx-auto">
      <div className="text-center mb-12">
        <Globe size={48} className="mx-auto text-cyan-400 mb-4" />
        <h1 className="text-3xl font-bold">Hauptstädte Quiz</h1>
        <p className="text-textSecondary">Welche Hauptstadt gehört zu welchem Land?</p>
      </div>

      <Card className="text-center p-10 space-y-8">
        <div className="text-textSecondary font-bold uppercase tracking-widest text-sm">Land</div>
        <div className="text-5xl font-black">{current.country}</div>
        
        <div className="h-24 flex items-center justify-center">
            {showAnswer ? (
                <div className="animate-enter text-3xl font-bold text-cyan-400">{current.capital}</div>
            ) : (
                <Button variant="outline" onClick={() => setShowAnswer(true)}>Antwort zeigen</Button>
            )}
        </div>

        {showAnswer && (
            <div className="flex gap-4">
                <Button variant="secondary" className="flex-1 bg-red-900/20 text-red-400" onClick={() => handleNext(false)}>
                    <X className="mr-2" /> Falsch
                </Button>
                <Button className="flex-1 bg-emerald-600" onClick={() => handleNext(true)}>
                    <Check className="mr-2" /> Richtig
                </Button>
            </div>
        )}
      </Card>
      
      <div className="text-center text-textTertiary font-mono">
          Fortschritt: {currentIdx + 1} / {DATA.length}
      </div>
    </div>
  );
};

export default Capitals;