import React, { useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface LogMessage {
  timestamp: Date;
  type: string;
  content: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

interface LogsDisplayProps {
  logs: LogMessage[];
  showFrameLogs: boolean;
  setShowFrameLogs: (value: boolean) => void;
}

const TerminalContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: '#0a0a0a',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '16px',
  height: '400px',
  overflow: 'hidden',
  fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '13px',
  position: 'relative',
}));

const LogsContainer = styled(Box)({
  height: '100%',
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: '8px',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#1a1a1a',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#444',
    borderRadius: '4px',
    '&:hover': {
      background: '#555',
    },
  },
});

const LogLine = styled(Box)<{ level: 'info' | 'warning' | 'error' | 'success' }>(({ level, theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  padding: '2px 0',
  borderBottom: '1px solid transparent',
  '&:hover': {
    borderBottom: '1px solid #333',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  '& .timestamp': {
    color: '#666',
    fontSize: '11px',
    minWidth: '60px',
    fontWeight: 'normal',
  },
  '& .type': {
    fontSize: '11px',
    minWidth: '120px',
    fontWeight: 'bold',
    color: level === 'error' ? '#ff5252' : 
          level === 'warning' ? '#ffa726' : 
          level === 'success' ? '#4caf50' : '#00bcd4',
  },
  '& .content': {
    color: level === 'error' ? '#ffcdd2' : 
          level === 'warning' ? '#fff3e0' : 
          level === 'success' ? '#e8f5e8' : '#e1f5fe',
    fontSize: '12px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
    flex: 1,
  },
}));

const LogsDisplay: React.FC<LogsDisplayProps> = ({ logs, showFrameLogs, setShowFrameLogs }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" sx={{ color: 'text.primary', mr: 2 }}>
            WebSocket Logs
          </Typography>
          <Chip
            label={`${logs.length} messages`}
            size="small"
            variant="outlined"
            sx={{ color: 'text.secondary' }}
          />
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={showFrameLogs}
              onChange={(e) => setShowFrameLogs(e.target.checked)}
              size="small"
              color="primary"
            />
          }
          label="Show Frame Logs"
          sx={{ color: 'text.secondary' }}
        />
      </Box>
      
      <TerminalContainer elevation={3}>
        <LogsContainer>
          {logs.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              color: '#666',
              fontSize: '14px' 
            }}>
              Waiting for WebSocket messages...
            </Box>
          ) : (
            <>
              {logs.map((log, index) => (
                <LogLine key={index} level={log.level}>
                  <span className="timestamp">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="type">
                    [{log.type}]
                  </span>
                  <span className="content">
                    {log.content}
                  </span>
                </LogLine>
              ))}
              <div ref={logsEndRef} />
            </>
          )}
        </LogsContainer>
      </TerminalContainer>
    </Box>
  );
};

export default LogsDisplay; 