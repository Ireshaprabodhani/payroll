import os
from dotenv import load_dotenv

load_dotenv()

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
