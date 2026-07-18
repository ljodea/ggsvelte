*** Settings ***
Documentation	Real NVDA journeys for ggsvelte's interaction evidence fixtures.
Force Tags	NVDA	ggsvelte_at	browser

Library	NvdaLib.py
Library	ggsvelte_at.py
Library	ScreenCapLibrary

Test Setup	Start ggsvelte NVDA test
Test Teardown	Finish ggsvelte NVDA test

*** Variables ***
${profile}	baseline

*** Keywords ***
Start ggsvelte NVDA test
	start NVDA	standard-dontShowWelcomeDialog.ini
	start evidence	${browser}	${targetUrl}	${evidenceDir}	${release}	${profile}

Finish ggsvelte NVDA test
	${finishStatus}	${finishError}=	Run Keyword And Ignore Error	finish evidence
	${screenshotName}=	create_preserved_test_output_filename	final-screen.png
	Run Keyword And Ignore Error	Take Screenshot	${screenshotName}
	dump_speech_to_log
	dump_braille_to_log
	Run Keyword And Ignore Error	close browser
	quit NVDA
	Should Be Equal	${finishStatus}	PASS	${finishError}

*** Test Cases ***
Release-blocking interaction journeys
	[Documentation]	Use public keyboard input and retain every exact speech utterance from grouped inspection through interval recovery.
	run inspection journey
	run interval journey
