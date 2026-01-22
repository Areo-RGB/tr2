import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS } from '../constants';
import { Card } from '../components/Shared';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-12 animate-enter">
      <header className="text-center py-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400">
          Training
        </h1>
        <p className="text-textSecondary font-bold uppercase tracking-[0.2em] text-sm">Training Tools Collection</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card 
              key={tool.id} 
              onClick={() => navigate(tool.path)}
              className={`group relative overflow-hidden border-l-4 ${tool.accentColor} transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer`}
            >
              <div className="flex items-start gap-4 z-10 relative">
                <div className="p-3 rounded-lg bg-surfaceHover text-textPrimary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{tool.name}</h2>
                  <p className="text-sm text-textSecondary leading-relaxed mb-4">{tool.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {tool.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase px-2 py-1 bg-white/5 rounded text-textTertiary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Home;