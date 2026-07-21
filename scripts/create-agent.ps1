$envPath = Join-Path $PSScriptRoot "..\.env.local"
$apiKey = $env:ELEVENLABS_API_KEY

if (-not $apiKey -and (Test-Path $envPath)) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "^ELEVENLABS_API_KEY=(.+)$") {
            $apiKey = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

if (-not $apiKey) {
    Write-Error "ELEVENLABS_API_KEY is not set in environment or .env.local"
    exit 1
}

$url = "https://api.elevenlabs.io/v1/convai/agents/create"

$headers = @{
    "xi-api-key" = $apiKey
    "Content-Type" = "application/json"
}

$body = @{
    name = "Switchboard Concierge"
    conversation_config = @{
        agent = @{
            first_message = "Hello! Welcome to our workspace. How can I help you today?"
            language = "en"
            prompt = @{
                prompt = "# Personality`nYou are a warm, professional, and articulate AI receptionist and front desk concierge.`n`n# Tone`n- Friendly, concise, helpful, and attentive.`n- Speak in clear, natural sentences suitable for real-time voice and text chat.`n`n# Goal`nHelp customers view business offerings, check availability, book appointments, or manage existing bookings. Always use the registered client tools when checking slots or making bookings."
                llm = "gemini-2.5-flash"
                temperature = 0.7
                tools = @(
                    @{
                        type = "client"
                        name = "get_business_info"
                        description = "Get published business details, services/offerings, and team members."
                        parameters = @{
                            type = "object"
                            properties = @{}
                        }
                    },
                    @{
                        type = "client"
                        name = "get_availability"
                        description = "Check available appointment slots for a specified offering and date (YYYY-MM-DD)."
                        parameters = @{
                            type = "object"
                            properties = @{
                                offering_name = @{ type = "string"; description = "Name of the offering or service" }
                                date = @{ type = "string"; description = "Date in YYYY-MM-DD format" }
                                team_member_name = @{ type = "string"; description = "Optional name of team member" }
                            }
                            required = @("offering_name", "date")
                        }
                    },
                    @{
                        type = "client"
                        name = "book_appointment"
                        description = "Book an appointment for a customer using a valid slot_id."
                        parameters = @{
                            type = "object"
                            properties = @{
                                offering_name = @{ type = "string"; description = "Name of the offering" }
                                slot_id = @{ type = "string"; description = "The slot ID selected from availability" }
                                customer_name = @{ type = "string"; description = "Customer full name" }
                                phone = @{ type = "string"; description = "Customer phone number" }
                                email = @{ type = "string"; description = "Customer email address" }
                                notes = @{ type = "string"; description = "Special notes or request" }
                            }
                            required = @("offering_name", "slot_id", "customer_name", "phone")
                        }
                    },
                    @{
                        type = "client"
                        name = "lookup_appointment"
                        description = "Look up an existing appointment using confirmation code and customer phone number."
                        parameters = @{
                            type = "object"
                            properties = @{
                                confirmation_code = @{ type = "string"; description = "The booking confirmation code" }
                                phone = @{ type = "string"; description = "Customer phone number" }
                            }
                            required = @("confirmation_code", "phone")
                        }
                    },
                    @{
                        type = "client"
                        name = "reschedule_appointment"
                        description = "Reschedule an existing booking to a new slot_id."
                        parameters = @{
                            type = "object"
                            properties = @{
                                confirmation_code = @{ type = "string"; description = "The booking confirmation code" }
                                phone = @{ type = "string"; description = "Customer phone number" }
                                slot_id = @{ type = "string"; description = "The new slot ID to reschedule into" }
                            }
                            required = @("confirmation_code", "phone", "slot_id")
                        }
                    },
                    @{
                        type = "client"
                        name = "cancel_appointment"
                        description = "Cancel an existing booking."
                        parameters = @{
                            type = "object"
                            properties = @{
                                confirmation_code = @{ type = "string"; description = "The booking confirmation code" }
                                phone = @{ type = "string"; description = "Customer phone number" }
                            }
                            required = @("confirmation_code", "phone")
                        }
                    }
                )
            }
        }
        tts = @{
            voice_id = "JBFqnCBsd6RMkjVDRZzb"
        }
    }
} | ConvertTo-Json -Depth 10

try {
    Write-Output "Sending request to ElevenLabs API..."
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    $agentId = $response.agent_id
    Write-Output "SUCCESS: Created Agent ID $agentId"

    $envRaw = Get-Content $envPath -Raw
    if ($envRaw -match "ELEVENLABS_DEFAULT_AGENT_ID=") {
        $envRaw = $envRaw -replace "ELEVENLABS_DEFAULT_AGENT_ID=.*", "ELEVENLABS_DEFAULT_AGENT_ID=$agentId"
    } else {
        $envRaw += "`nELEVENLABS_DEFAULT_AGENT_ID=$agentId`n"
    }
    Set-Content -Path $envPath -Value $envRaw -Encoding UTF8
    Write-Output "Updated .env.local with ELEVENLABS_DEFAULT_AGENT_ID=$agentId"
} catch {
    Write-Error $_
}
