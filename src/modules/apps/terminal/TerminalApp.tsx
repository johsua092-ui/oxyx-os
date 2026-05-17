"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Terminal
// Fully interactive terminal with command parsing connected to
// the Oxyx Virtual File System (Firebase Firestore).
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  listDirectory,
  readFile,
  createDirectory,
  writeFile,
  deleteNode,
  resolvePath,
  pathExists,
  initializeVFS,
} from '@/core/engine/vfs/vfs';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

let lineId = 0;

export const TerminalApp: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [cwd, setCwd] = useState('/home');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize VFS on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeVFS();
        addLine('system', 'Oxyx OS Terminal v1.0');
        addLine('system', 'Virtual File System initialized. Type "help" for commands.');
        addLine('system', '');
        setIsReady(true);
      } catch {
        addLine('error', 'Failed to initialize file system. Check Firebase connection.');
        setIsReady(true);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on click anywhere
  const focusInput = () => inputRef.current?.focus();

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, { id: ++lineId, type, content }]);
  }, []);

  const executeCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Show user input
    addLine('input', `${cwd} $ ${trimmed}`);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'help': {
          const helpText = [
            'Available commands:',
            '',
            '  ls [path]          List directory contents',
            '  cd <path>          Change directory',
            '  pwd                Print working directory',
            '  mkdir <name>       Create directory',
            '  touch <name>       Create empty file',
            '  cat <file>         Read file contents',
            '  echo <text> > <f>  Write text to file',
            '  rm <path>          Remove file or empty directory',
            '  clear              Clear terminal',
            '  whoami             Current user',
            '  date               Current date and time',
            '  tree               Show directory tree',
            '  neofetch           System information',
            '  help               Show this help',
          ];
          helpText.forEach(l => addLine('output', l));
          break;
        }

        case 'ls': {
          const targetPath = args[0] ? resolvePath(cwd, args[0]) : cwd;
          const nodes = await listDirectory(targetPath);
          if (nodes.length === 0) {
            addLine('output', '(empty)');
          } else {
            nodes.forEach(n => {
              const suffix = n.type === 'directory' ? '/' : '';
              const size = n.type === 'file' ? `  ${n.size}B` : '';
              addLine('output', `  ${n.type === 'directory' ? 'd' : '-'}  ${n.name}${suffix}${size}`);
            });
          }
          break;
        }

        case 'cd': {
          if (!args[0] || args[0] === '~') {
            setCwd('/home');
            break;
          }
          const targetDir = resolvePath(cwd, args[0]);
          const exists = await pathExists(targetDir);
          if (exists) {
            const node = await readFile(targetDir);
            if (node?.type === 'directory') {
              setCwd(targetDir);
            } else {
              addLine('error', `cd: not a directory: ${args[0]}`);
            }
          } else {
            addLine('error', `cd: no such directory: ${args[0]}`);
          }
          break;
        }

        case 'pwd': {
          addLine('output', cwd);
          break;
        }

        case 'mkdir': {
          if (!args[0]) { addLine('error', 'mkdir: missing operand'); break; }
          const dirPath = resolvePath(cwd, args[0]);
          const created = await createDirectory(dirPath);
          if (!created) addLine('error', `mkdir: cannot create directory '${args[0]}': already exists or parent missing`);
          break;
        }

        case 'touch': {
          if (!args[0]) { addLine('error', 'touch: missing operand'); break; }
          const filePath = resolvePath(cwd, args[0]);
          const exists = await pathExists(filePath);
          if (!exists) {
            await writeFile(filePath, '');
          }
          break;
        }

        case 'cat': {
          if (!args[0]) { addLine('error', 'cat: missing operand'); break; }
          const filePath = resolvePath(cwd, args[0]);
          const file = await readFile(filePath);
          if (!file) { addLine('error', `cat: ${args[0]}: No such file`); break; }
          if (file.type === 'directory') { addLine('error', `cat: ${args[0]}: Is a directory`); break; }
          const contentLines = (file.content || '').split('\n');
          contentLines.forEach(l => addLine('output', l));
          break;
        }

        case 'echo': {
          const joinedArgs = args.join(' ');
          const redirectIndex = joinedArgs.indexOf('>');
          if (redirectIndex !== -1) {
            const text = joinedArgs.substring(0, redirectIndex).trim().replace(/^["']|["']$/g, '');
            const fileName = joinedArgs.substring(redirectIndex + 1).trim();
            if (!fileName) { addLine('error', 'echo: missing file name after >'); break; }
            const filePath = resolvePath(cwd, fileName);
            await writeFile(filePath, text);
          } else {
            addLine('output', joinedArgs);
          }
          break;
        }

        case 'rm': {
          if (!args[0]) { addLine('error', 'rm: missing operand'); break; }
          const rmPath = resolvePath(cwd, args[0]);
          const result = await deleteNode(rmPath);
          if (!result.success) addLine('error', `rm: ${result.error}`);
          break;
        }

        case 'clear': {
          setLines([]);
          break;
        }

        case 'whoami': {
          addLine('output', 'root@oxyx-os');
          break;
        }

        case 'date': {
          addLine('output', new Date().toString());
          break;
        }

        case 'tree': {
          const printTree = async (path: string, prefix: string) => {
            const nodes = await listDirectory(path);
            for (let i = 0; i < nodes.length; i++) {
              const isLast = i === nodes.length - 1;
              const connector = isLast ? '└── ' : '├── ';
              const childPrefix = isLast ? '    ' : '│   ';
              addLine('output', `${prefix}${connector}${nodes[i].name}${nodes[i].type === 'directory' ? '/' : ''}`);
              if (nodes[i].type === 'directory') {
                await printTree(nodes[i].path, prefix + childPrefix);
              }
            }
          };
          const treePath = args[0] ? resolvePath(cwd, args[0]) : cwd;
          addLine('output', treePath);
          await printTree(treePath, '');
          break;
        }

        case 'neofetch': {
          const info = [
            '',
            '    ╔══════════╗       root@oxyx-os',
            '    ║  OXYX OS ║       ──────────────────',
            '    ╚══════════╝       OS: Oxyx OS v1.0',
            '                       Kernel: Web/Chromium',
            '      ◆ ◆ ◆ ◆          Shell: oxyx-terminal',
            '      ◆ ◆ ◆ ◆          Engine: Next.js 16',
            '      ◆ ◆ ◆ ◆          Backend: Firebase',
            '      ◆ ◆ ◆ ◆          AI: Gemini / Groq',
            '                       Uptime: ' + Math.floor(performance.now() / 1000) + 's',
            '',
          ];
          info.forEach(l => addLine('output', l));
          break;
        }

        default: {
          addLine('error', `${cmd}: command not found. Type "help" for available commands.`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLine('error', `Error: ${msg}`);
    }
  }, [cwd, addLine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(currentInput);
      setCurrentInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(history[newIndex]);
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full w-full bg-[#08080a] font-mono text-[13px] leading-relaxed flex flex-col overflow-hidden cursor-text"
      onClick={focusInput}
    >
      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
        {lines.map((line) => (
          <div key={line.id} className={getLineStyle(line.type)}>
            {line.type === 'input' ? (
              <span>
                <span className="text-white/25">{line.content.split('$')[0]}$</span>
                <span className="text-white/65"> {line.content.split('$ ').slice(1).join('$ ')}</span>
              </span>
            ) : (
              <span>{line.content}</span>
            )}
          </div>
        ))}

        {/* Active Input Line */}
        {isReady && (
          <div className="flex items-center gap-0 mt-1">
            <span className="text-white/25 shrink-0">{cwd} $ </span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white/65 outline-none border-none caret-white/50"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

function getLineStyle(type: TerminalLine['type']): string {
  switch (type) {
    case 'input': return 'text-white/50';
    case 'output': return 'text-white/55 whitespace-pre';
    case 'error': return 'text-red-400/70';
    case 'system': return 'text-white/20 italic';
    default: return 'text-white/50';
  }
}
