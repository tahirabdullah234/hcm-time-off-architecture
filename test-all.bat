@echo off
echo ============================================
echo  HCM Time-Off Module — Test Suite Runner
echo ============================================
echo.
echo  STEP 1/2: Running all 57 automated tests...
echo  (This tests offline mode, silent failures,
echo   rollbacks, location segregation, and more)
echo ============================================
call npm test
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Some tests FAILED. Check output above.
    pause
    exit /b %errorlevel%
)
echo.
echo  ✅ All 57 automated tests PASSED.
echo.
echo ============================================
echo  STEP 2/2: Open Storybook in your browser...
echo  (Shows 22 visual states for every scenario)
echo  Once opened, click "TimeOff" in the sidebar
echo  to see Loading, Stale, Optimistic, Offline,
echo  Silent Failure, HCM Rejected, and more.
echo ============================================
start http://localhost:6006
call npm run storybook
pause
