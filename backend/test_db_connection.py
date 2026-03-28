"""Test script to verify database connection is working."""

import asyncio
import logging
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_get_pool():
    """Test that get_pool() works correctly."""
    from db.postgres import get_pool
    
    logger.info("Testing get_pool()...")
    
    try:
        pool = await get_pool()
        
        if pool is None:
            logger.warning("get_pool() returned None - database is unavailable")
            logger.info("This is expected behavior when database connection fails")
            return False
        
        logger.info("get_pool() returned a pool object successfully")
        
        # Try to acquire a connection
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            logger.info("Database connection test successful: SELECT 1 = %s", result)
            return True
            
    except Exception as e:
        logger.error("get_pool() test failed: %s", e, exc_info=True)
        return False



async def main():
    """Run all tests."""
    logger.info("=" * 60)
    logger.info("Database Connection Test Suite")
    logger.info("=" * 60)
    
    # Test 1: get_pool()
    logger.info("\n--- Test 1: get_pool() ---")
    pool_ok = await test_get_pool()
    
 
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Test Results:")
    logger.info("  get_pool():  %s", "PASS" if pool_ok else "FAIL (database unavailable)")
    if pool_ok:
        logger.info("All tests passed! Database is working correctly.")
        return 0
    else:
        logger.warning("Some tests failed. Database may be unavailable.")
        logger.info("This is expected if DATABASE_URL is invalid or PostgreSQL is not running.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
