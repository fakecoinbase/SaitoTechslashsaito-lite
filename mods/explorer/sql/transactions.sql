CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER, 
    address TEXT, 
    amt TEXT, 
    bid INTEGER,
    tid INTEGER, 
    sid INTEGER, 
    bhash TEXT, 
    lc INTEGER, 
    rebroadcast INTEGER, 
    sig TEXT,
    ts INTEGER,
    type TEXT,
    tx_from TEXT,
    tx_to TEXT,
    name TEXT,
    module TEXT
);
