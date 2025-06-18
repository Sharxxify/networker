-- Create log_entries table to store parsed log data
CREATE TABLE IF NOT EXISTS log_entries (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES uploaded_files(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    call_id VARCHAR(100),
    cell_id VARCHAR(100),
    message_type VARCHAR(50),
    direction VARCHAR(50),
    status VARCHAR(20),
    message TEXT,
    raw_line TEXT,
    line_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_log_entries_file_id ON log_entries(file_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_log_entries_call_id ON log_entries(call_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_cell_id ON log_entries(cell_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_status ON log_entries(status);
