-- Users
CREATE TABLE IF NOT EXISTS users (
	id			SERIAL PRIMARY KEY,
	google_id	VARCHAR(64) UNIQUE NOT NULL,
	email		VARCHAR(255) UNIQUE ,
	name		TEXT,
	avatar_url	TEXT,
	created_at	TIMESTAMPTZ DEFAULT NOW()
);

-- Persistent auth tokens (stored as SHA-256 hash, never plaintext)
CREATE TABLE IF NOT EXISTS auth_tokens (
	id			SERIAL PRIMARY KEY,
	user_id		INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash	TEXT    UNIQUE NOT NULL,
	expires_at	TIMESTAMPTZ NOT NULL,
	revoked		BOOLEAN DEFAULT FALSE,
	created_at	TIMESTAMPTZ DEFAULT NOW()
);
--
-- CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash   ON auth_tokens(token_hash);
-- CREATE INDEX IF NOT EXISTS idx_auth_tokens_user   ON auth_tokens(user_id);
-- CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(token_hash)
--   WHERE revoked = FALSE;
--
-- Sites
CREATE TABLE IF NOT EXISTS sites (
	id			SERIAL PriMARY KEY,
	user_id		INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	subdomain	TEXT    UNIQUE NOT NULL,
	name		TEXT    NOT NULL,
	status		VARCHAR(20)	DEFAULT 'EMPTY',
	created_at	TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id);
-- CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
	id			  UUID    PRIMARY KEY,
	site_id		  INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
	version		  INTEGER NOT NULL,
	status		  TEXT    NOT NULL DEFAULT 'UPLOADED', -- UPLOADED| EXTRACTING | VALIDATING | READY | LIVE | FAILED | ARCHIVED
	zip_path	  TEXT    NOT NULL,
	deploy_dir	  TEXT,
	error_msg	  TEXT,
	created_at	  TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(site_id, version) -- prevent duplicate versions caused by concurrent requests
);

-- CREATE INDEX IF NOT EXISTS idx_deployments_site   ON deployments(site_id);
-- CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
