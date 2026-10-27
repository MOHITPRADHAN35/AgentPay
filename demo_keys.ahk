#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; Realistic 1x human typing simulator (35-65ms per keystroke)
TypeHuman(text, minDelay := 35, maxDelay := 65) {
    for char in StrSplit(text) {
        SendText char
        Sleep Random(minDelay, maxDelay)
    }
}

; F6  -> Blocked Prompt ($450 H100 GPU Cluster)
F6::TypeHuman("Purchase eight H100 GPUs for $450.")

; F7  -> Approved Prompt ($9.80 Cloud GPU Instance)
F7::TypeHuman("Purchase one hour of cloud compute for $9.80.")

; F8  -> Approved Prompt ($15.00 LLM Token Credits)
F8::TypeHuman("Top up LLM API token credits for the research agent.")

; F9  -> PayPal Sandbox Buyer Email
F9::TypeHuman("sb-o4oe4753419327@personal.example.com")

; F10 -> PayPal Sandbox Buyer Password
F10::TypeHuman('9-"$7b(E')
