/* GENERATED from the SOS Offline Survival Guide (scottyfncodes/SOS, index.html,
   branch claude/open-run-build-complete-rrk4y7) by evaluating its own data and
   render functions, so the wording is the source's. Edit it here and in SOS.
   What changed in the port is listed in docs/SAFETY.md. */
import type { Article, TriageFlows } from "./types";

export const ARTICLES: Article[] = [
  {
    "id": "weather",
    "title": "Weather",
    "blurb": "Lightning, heat, cold, floods, storms.",
    "sections": [
      {
        "title": "Weather",
        "blocks": [
          {
            "t": "h",
            "text": "Lightning - the 30-30 rule"
          },
          {
            "t": "p",
            "text": "If the gap between seeing lightning and hearing thunder is less than 30 seconds, take shelter. Wait 30 minutes after the last thunder before going back outside. Avoid open fields, isolated tall trees, water, and metal objects. Caught in the open, crouch low on the balls of your feet - don't lie flat."
          },
          {
            "t": "h",
            "text": "Extreme heat"
          },
          {
            "t": "p",
            "text": "Drink water before you feel thirsty. Seek shade during peak midday hours. Wear light, loose clothing. Watch companions for heat exhaustion/heat stroke signs (see First Aid)."
          },
          {
            "t": "h",
            "text": "Extreme cold / wind chill"
          },
          {
            "t": "p",
            "text": "Layer clothing and cover extremities - most heat is lost from the head, hands, and feet. Watch for frostbite: numbness and white or waxy-looking skin. Stay dry; wet clothing loses insulating value fast."
          },
          {
            "t": "h",
            "text": "Flash floods"
          },
          {
            "t": "p",
            "text": "Never cross moving water: 6 in (15 cm) can knock an adult off their feet, and 12-24 in (30-60 cm) can float a vehicle. Move to higher ground immediately during heavy rain and avoid camping in dry washes or canyon bottoms."
          },
          {
            "t": "h",
            "text": "Tornado"
          },
          {
            "t": "p",
            "text": "Get to the lowest level, interior room, away from windows. Avoid vehicles and mobile structures. If caught outside with no shelter, lie flat in a low ditch and cover your head."
          },
          {
            "t": "h",
            "text": "Hurricane / high wind"
          },
          {
            "t": "p",
            "text": "Secure or shelter well before arrival. Avoid coastal and flood-prone areas. Prepare for extended power and communication outages."
          }
        ]
      }
    ]
  },
  {
    "id": "nav",
    "title": "Navigation",
    "blurb": "Find direction without a compass.",
    "sections": [
      {
        "title": "Navigation",
        "blocks": [
          {
            "t": "h",
            "text": "Shadow-stick method"
          },
          {
            "t": "p",
            "text": "Push a straight stick upright into open ground."
          },
          {
            "t": "figure",
            "fig": "shadow"
          },
          {
            "t": "steps",
            "items": [
              "Mark the tip of the stick's shadow (this is roughly the west mark).",
              "Wait 15-20 minutes without moving the stick.",
              "Mark the new shadow tip (roughly the east mark).",
              "Draw a line between the two marks: it runs approximately west to east.",
              "A line perpendicular to it, crossing between the marks, points roughly north-south."
            ]
          },
          {
            "t": "h",
            "text": "Big Dipper → North Star"
          },
          {
            "t": "figure",
            "fig": "dipper"
          },
          {
            "t": "p",
            "text": "Find the two \"pointer stars\" at the front edge of the Big Dipper's bowl. Draw an imaginary line through them, extending about 5 times the distance between them - it lands on Polaris, the North Star, which sits above true north."
          },
          {
            "t": "h",
            "text": "Moon-phase direction (rough estimate only)"
          },
          {
            "t": "p",
            "text": "A waxing moon (lit on the right side, Northern Hemisphere) rises in the afternoon and sets after sunset roughly in the west. A waning moon (lit on the left side) rises before sunrise roughly in the east. This is only a rough estimate - prefer the sun, stars, or a compass whenever available."
          }
        ]
      }
    ]
  },
  {
    "id": "signal",
    "title": "Signaling",
    "blurb": "Get found: SOS, mirrors, ground signals.",
    "sections": [
      {
        "title": "Signaling",
        "blocks": [
          {
            "t": "h",
            "text": "SOS - the universal distress signal"
          },
          {
            "t": "p",
            "text": "··· ––– ···"
          },
          {
            "t": "p",
            "text": "3 short signals, 3 long, 3 short - repeat. Works with a whistle, flashlight, mirror flashes, or shouted/radio calls."
          },
          {
            "t": "h",
            "text": "Signal mirror"
          },
          {
            "t": "p",
            "text": "Hold the mirror close to your eye. Extend your other hand and make a V with two fingers, framing the target (aircraft, boat, ridge). Angle the mirror so the reflected sunlight spot passes through the V toward the target, then sweep slowly across the horizon. Effective for miles in direct sun."
          },
          {
            "t": "h",
            "text": "Whistle"
          },
          {
            "t": "p",
            "text": "3 sharp blasts is a universally recognized distress call - far less effort than shouting and carries much farther."
          },
          {
            "t": "h",
            "text": "Fire & smoke"
          },
          {
            "t": "p",
            "text": "Three fires arranged in a triangle or straight line is a recognized distress pattern. Green boughs thrown on a fire create heavy white smoke by day; a clear, bright fire is more visible at night."
          },
          {
            "t": "h",
            "text": "Ground-to-air symbols"
          },
          {
            "t": "table",
            "head": [
              "Symbol",
              "Meaning"
            ],
            "rows": [
              [
                "V",
                "Require assistance"
              ],
              [
                "X",
                "Require medical assistance"
              ],
              [
                "N",
                "No / negative"
              ],
              [
                "Y",
                "Yes / affirmative"
              ],
              [
                "↑",
                "Proceeding in this direction"
              ],
              [
                "F",
                "Need food and water"
              ],
              [
                "■■",
                "All is well"
              ]
            ]
          },
          {
            "t": "p",
            "text": "Make symbols large (at least 10 ft / 3 m) using rocks, logs, trampled vegetation, or dug trenches so they are visible from the air."
          },
          {
            "t": "h",
            "text": "General tips"
          },
          {
            "t": "list",
            "items": [
              "Straight lines, right angles, and bright colors rarely occur in nature - they draw the eye.",
              "Movement and contrast attract attention faster than a static object.",
              "Sound and light travel farther at night and in calm, still air."
            ]
          }
        ]
      },
      {
        "title": "Screen Strobe / SOS Flashlight",
        "blocks": [
          {
            "t": "p",
            "text": "Uses your screen as a signal light. Works fully offline - no permissions, no network. Set your screen brightness to maximum first for the best range."
          },
          {
            "t": "strobe"
          },
          {
            "t": "warn",
            "title": "Before you use this",
            "items": [
              "Flashes rapidly - avoid this feature if you are photosensitive or have epilepsy.",
              "A large STOP button stays on screen the whole time to end it instantly."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "water",
    "title": "Water & Food",
    "blurb": "Purify water, find it, and eat safely.",
    "sections": [
      {
        "title": "Water & Food",
        "blocks": [
          {
            "t": "h",
            "text": "Purification methods"
          },
          {
            "t": "table",
            "head": [
              "Method",
              "Notes"
            ],
            "rows": [
              [
                "Boiling",
                "Rolling boil 1 min (3 min above 6,500 ft / 2,000 m). Most reliable, kills all pathogens."
              ],
              [
                "Unscented bleach",
                "5-9% sodium hypochlorite, no added scents/soaps. Wait 30 min before drinking."
              ],
              [
                "Purification tablets",
                "Follow product label; wait time varies (often 30-60 min)."
              ],
              [
                "Filter",
                "Removes bacteria/protozoa; check if it also removes viruses."
              ],
              [
                "UV pen",
                "Needs clear water and working batteries."
              ]
            ]
          },
          {
            "t": "h",
            "text": "Finding water"
          },
          {
            "t": "p",
            "text": "Priority: flowing water over stagnant, moving over still. Avoid water near dead animals, algae blooms, or industrial runoff. Collect dew or rainwater when possible - both are relatively clean but should still be treated if time allows."
          },
          {
            "t": "h",
            "text": "Food safety & foraging"
          },
          {
            "t": "p",
            "text": "When food is uncertain, prioritize known-safe sources. Never eat mushrooms unless positively identified. Cook wild game and fish thoroughly. If forced to test an unknown plant, use extreme caution: separate parts, test a small skin patch, wait between steps - this can still be dangerous and is a last resort only."
          }
        ]
      }
    ]
  },
  {
    "id": "shelter",
    "title": "Shelter",
    "blurb": "Lean-to and debris hut builds.",
    "sections": [
      {
        "title": "Shelter",
        "blocks": [
          {
            "t": "p",
            "text": "Insulating yourself from the ground matters as much as blocking wind - most body heat is lost downward into cold ground."
          },
          {
            "t": "h",
            "text": "Siting your shelter"
          },
          {
            "t": "list",
            "items": [
              "Avoid low ground and dry creek beds (flash flood risk).",
              "Check overhead for dead branches (\"widow makers\").",
              "Stay near, but not in, a water source.",
              "Face the entrance away from prevailing wind."
            ]
          }
        ]
      },
      {
        "title": "Lean-to shelter",
        "blocks": [
          {
            "t": "figure",
            "fig": "leanto"
          },
          {
            "t": "steps",
            "items": [
              "Find or set a sturdy ridge pole against a tree fork or two uprights, angled about 45 degrees.",
              "Lay ribbing branches along one side of the ridge pole, spaced a few inches apart.",
              "Thatch with debris (leaves, boughs, bark) from the bottom up, like shingles, for water shedding.",
              "Add a thick insulating floor layer of dry leaves or boughs.",
              "Block the open end you're not using to cut wind."
            ]
          }
        ]
      },
      {
        "title": "Debris hut",
        "blocks": [
          {
            "t": "figure",
            "fig": "debris"
          },
          {
            "t": "steps",
            "items": [
              "Build a low ridge pole tunnel just barely wider than your body, one end propped on a support.",
              "Lean a rib lattice of branches along both sides of the ridge pole.",
              "Pile debris (leaves, pine needles, duff) at least 2-3 ft (60-90 cm) thick over the whole frame.",
              "Stuff the interior with loose, dry insulating debris.",
              "Leave a small entrance and plug it with a debris \"door\" once inside."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "fire",
    "title": "Fire",
    "blurb": "Methods, tinder, and fire safety.",
    "sections": [
      {
        "title": "Fire",
        "blocks": [
          {
            "t": "h",
            "text": "Starting methods"
          },
          {
            "t": "table",
            "head": [
              "Method",
              "Difficulty",
              "Reliability"
            ],
            "rows": [
              [
                "Lighter / matches",
                "Very low",
                "High (if dry)"
              ],
              [
                "Ferro rod / firesteel",
                "Low",
                "High, works wet"
              ],
              [
                "Battery + steel wool",
                "Low",
                "High if battery available"
              ],
              [
                "Magnifying lens / glasses",
                "Low",
                "Needs direct sun"
              ],
              [
                "Flint & steel + char cloth",
                "Medium",
                "Medium-high, needs practice"
              ],
              [
                "Bow drill",
                "High",
                "Medium, skill dependent"
              ],
              [
                "Hand drill",
                "Very high",
                "Low, needs dry materials and practice"
              ]
            ]
          },
          {
            "t": "h",
            "text": "Tinder, kindling, fuel"
          },
          {
            "t": "list",
            "items": [
              {
                "lead": "Tinder",
                "text": "(catches a spark): dry grass, birch bark, fine wood shavings, cotton, dryer lint."
              },
              {
                "lead": "Kindling",
                "text": "(grows the flame): pencil- to thumb-thick dry twigs, smallest first."
              },
              {
                "lead": "Fuel",
                "text": "(sustains the fire): wrist-thick and larger dry, seasoned wood."
              }
            ]
          },
          {
            "t": "h",
            "text": "Fire lay structures"
          },
          {
            "t": "p",
            "runs": [
              {
                "b": "Teepee:"
              },
              " tinder in the center, kindling leaned around it in a cone - burns hot and fast, good for starting. ",
              {
                "b": "Log cabin:"
              },
              " fuel stacked in a square around the teepee - burns longer, good for cooking coals."
            ]
          },
          {
            "t": "h",
            "text": "Fire safety"
          },
          {
            "t": "list",
            "items": [
              "Clear a wide area down to bare soil; ring with stones if available.",
              "Never leave a fire unattended.",
              "Fully extinguish: drown with water, stir the ashes, drown again, and feel for heat before leaving."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "wildlife",
    "title": "Wildlife",
    "blurb": "Bears, snakes, cougars, insects, ticks.",
    "sections": [
      {
        "title": "Wildlife",
        "blocks": [
          {
            "t": "h",
            "text": "Bear encounters"
          },
          {
            "t": "p",
            "text": "Never run - it can trigger a chase instinct. Speak in a low, calm voice and back away slowly, giving the bear an escape route. Make yourself look larger and use bear spray if charged. If a brown/grizzly bear makes contact, play dead: lie flat, protect your neck and head. If a black bear attacks, fight back aggressively, targeting the face and muzzle. Store food well away from your camp using a hang or canister."
          },
          {
            "t": "h",
            "text": "Snakes"
          },
          {
            "t": "p",
            "text": "Give snakes a wide berth and watch where you step and reach, especially around rocks and brush. Most bites happen when a snake is handled or provoked - leave them alone. If bitten, use the First Aid snake bite flow."
          },
          {
            "t": "h",
            "text": "Mountain lion / cougar"
          },
          {
            "t": "p",
            "text": "Don't run. Make noise, appear as large as possible, and keep children close and picked up. If attacked, fight back hard, targeting the eyes and face."
          },
          {
            "t": "h",
            "text": "Insect stings & allergic reactions"
          },
          {
            "t": "p",
            "text": "Remove a stinger by scraping it out sideways (not pinching, which injects more venom). Watch for signs of a severe allergic reaction - see First Aid > Allergic reaction."
          },
          {
            "t": "h",
            "text": "Ticks"
          },
          {
            "t": "p",
            "text": "Check your whole body after time in brush or woods. Remove a tick promptly using fine-tipped tweezers, grasping close to the skin, and pulling straight up with steady pressure. Watch for rash or fever in the following weeks."
          }
        ]
      }
    ]
  },
  {
    "id": "vehicle",
    "title": "Vehicle Emergencies",
    "blurb": "Stranded, breakdown, overheating, submersion.",
    "sections": [
      {
        "title": "Vehicle Emergencies",
        "blocks": [
          {
            "t": "h",
            "text": "Stranded in snow"
          },
          {
            "t": "p",
            "text": "Stay with the vehicle - it's far easier for rescuers to find than a person on foot. Run the engine about 10 minutes each hour for heat, cracking a window for ventilation. Make sure the exhaust pipe isn't blocked by snow (carbon monoxide risk). Stay visible: tie bright cloth to the antenna, use the dome light at night. Keep moving your arms and legs to maintain circulation."
          },
          {
            "t": "h",
            "text": "Breakdown on the road"
          },
          {
            "t": "p",
            "text": "Pull as far off the roadway as possible and turn on hazard lights. Place flares or reflective triangles behind the vehicle if available. If it's safer, exit away from traffic to a location off the road; if you stay inside, keep your seatbelt on."
          },
          {
            "t": "h",
            "text": "Stuck in mud or sand"
          },
          {
            "t": "p",
            "text": "Don't spin the wheels - it digs you in deeper. Clear debris/sand from around the tires, use traction aids like boards or floor mats, and for sand, slightly deflating tires can help. Rock the vehicle gently forward and back if safe to do so."
          },
          {
            "t": "h",
            "text": "Overheating engine"
          },
          {
            "t": "p",
            "text": "Pull over safely and turn off the AC, turning on the heater to draw heat away from the engine. Let it cool 15-20 minutes before opening the hood. Never open a hot radiator cap - pressurized coolant can cause severe burns."
          },
          {
            "t": "h",
            "text": "Submerged / sinking vehicle"
          },
          {
            "t": "p",
            "text": "Unbuckle your seatbelt immediately and open a window or break it right away, before the vehicle fully submerges - power windows and doors can fail once underwater. Get out through the window if the door won't open, get children or the lightest occupants out first, then swim to the surface."
          },
          {
            "t": "h",
            "text": "Keep in the vehicle"
          },
          {
            "t": "p",
            "text": "Blanket, water, flashlight, basic tools, jumper cables, and some food make up a solid baseline emergency kit."
          }
        ]
      }
    ]
  },
  {
    "id": "hazards",
    "title": "Wildfires, Earthquakes & Landslides",
    "blurb": "From SOS's Natural Disasters: the three that reach the backcountry.",
    "sections": [
      {
        "title": "Wildfires",
        "blocks": [
          {
            "t": "h",
            "text": "Before fire season"
          },
          {
            "t": "p",
            "text": "Know at least two evacuation routes from home in advance, sign up for local emergency alerts, and keep a vehicle fueled and ready during high-risk periods. Create defensible space by clearing dead brush and vegetation roughly 30 ft (9 m) from structures."
          },
          {
            "t": "h",
            "text": "If evacuation is ordered"
          },
          {
            "t": "p",
            "text": "Leave immediately rather than waiting to see how close the fire gets. Close all windows and doors, remove flammable curtains, and shut off gas at the meter before leaving if time allows."
          },
          {
            "t": "h",
            "text": "If trapped with no escape route"
          },
          {
            "t": "steps",
            "items": [
              "In a vehicle: stay inside, close windows and vents, turn headlights on, get down below window level, and cover yourself with a blanket or jacket as a last resort.",
              "On foot: move to a cleared area away from vegetation, downhill from the fire if possible.",
              "If caught in the open with fire approaching, lie face down in a low spot and cover exposed skin with wet cloth if available."
            ]
          }
        ]
      },
      {
        "title": "Earthquakes",
        "blocks": [
          {
            "t": "h",
            "text": "During the shaking"
          },
          {
            "t": "steps",
            "items": [
              "Drop to the ground before it drops you.",
              "Take Cover under a sturdy table or desk if one is nearby.",
              "Hold On to it, and protect your head and neck until the shaking stops.",
              "If in bed, stay there and cover your head with a pillow rather than run for a doorway.",
              "If outdoors, move to an open area away from buildings, trees, and power lines.",
              "If driving, pull over away from overpasses, bridges, and power lines, and stay inside the vehicle until shaking stops."
            ]
          },
          {
            "t": "h",
            "text": "After the shaking stops"
          },
          {
            "t": "p",
            "text": "Expect aftershocks. Check for gas leaks by smell or a hissing sound - if suspected, shut off the gas at the main valve and leave the area without using switches, lighters, or anything that could spark. Check for structural damage before re-entering a building, and be cautious around damaged stairs, chimneys, and overhead fixtures."
          },
          {
            "t": "warn",
            "title": "What NOT to do",
            "items": [
              "Do not run outside during the shaking - falling debris near exits and walls is a leading cause of injury.",
              "Standing in a doorway is an outdated myth - modern doorways are not stronger than the rest of the structure. Get under sturdy furniture instead.",
              "Do not use elevators after an earthquake."
            ]
          }
        ]
      },
      {
        "title": "Landslides & Mudslides",
        "blocks": [
          {
            "t": "h",
            "text": "Warning signs"
          },
          {
            "t": "list",
            "items": [
              "Cracking sounds from trees, or cracks opening in the ground or pavement.",
              "A sudden increase or decrease in stream or creek water levels, especially if it turns muddy.",
              "Doors or windows sticking for the first time.",
              "Trees, fences, or retaining walls slowly tilting."
            ]
          },
          {
            "t": "p",
            "text": "If any of these appear during or after heavy rain on steep terrain, move away and uphill, perpendicular to the likely flow path - never cross it. If actually caught in a slide, curl into a tight ball and protect your head."
          }
        ]
      }
    ]
  }
];

export const TRIAGE: TriageFlows = {
  "entry": {
    "start": {
      "type": "menu",
      "title": "What's the situation?",
      "items": [
        {
          "label": "Severe bleeding",
          "go": "bleeding:start"
        },
        {
          "label": "Not breathing / unresponsive",
          "go": "breathing:start"
        },
        {
          "label": "Trouble breathing",
          "go": "breathing_distress:start"
        },
        {
          "label": "Chest pain / possible heart attack",
          "go": "cardiac:start"
        },
        {
          "label": "Seizure",
          "go": "seizure:start"
        },
        {
          "label": "Choking",
          "go": "choking:start"
        },
        {
          "label": "Burn",
          "go": "burns:start"
        },
        {
          "label": "Broken bone / severe sprain",
          "go": "fracture:start"
        },
        {
          "label": "Head or spinal injury",
          "go": "headspinal:start"
        },
        {
          "label": "Cold exposure / hypothermia",
          "go": "hypothermia:start"
        },
        {
          "label": "Frostbite",
          "go": "frostbite:start"
        },
        {
          "label": "Overheating / heat illness",
          "go": "heat:start"
        },
        {
          "label": "Dehydration",
          "go": "dehydration:start"
        },
        {
          "label": "Snake or animal bite",
          "go": "snakebite:start"
        },
        {
          "label": "Shock (pale, cold, rapid pulse)",
          "go": "shock:start"
        },
        {
          "label": "Severe allergic reaction",
          "go": "allergic:start"
        },
        {
          "label": "Poison / chemical exposure",
          "go": "poison:start"
        },
        {
          "label": "Electrical injury",
          "go": "electrical:start"
        },
        {
          "label": "Fire",
          "go": "fireemergency:start"
        },
        {
          "label": "Vehicle emergency",
          "go": "vehicleemergency:start"
        },
        {
          "label": "Water emergency / drowning",
          "go": "waterincident:start"
        },
        {
          "label": "Lost / stranded",
          "go": "lost:start"
        },
        {
          "label": "Other emergency",
          "go": "other:start"
        }
      ]
    }
  },
  "breathing": {
    "start": {
      "type": "q",
      "text": "Is the person responsive? Tap their shoulder and shout.",
      "options": [
        {
          "label": "Yes, responsive",
          "next": "responsive"
        },
        {
          "label": "No response",
          "next": "check_breathing"
        }
      ]
    },
    "check_breathing": {
      "type": "q",
      "text": "Is the person breathing normally?",
      "options": [
        {
          "label": "Yes, breathing normally",
          "next": "recovery"
        },
        {
          "label": "No, not breathing or gasping",
          "next": "no_breath"
        }
      ]
    },
    "responsive": {
      "type": "result",
      "severity": "moderate",
      "title": "Responsive",
      "steps": [
        "Check for visible injuries and severe bleeding first.",
        "Keep the person still and calm.",
        "Call/send for emergency help if condition is serious or unclear.",
        "Continue to monitor breathing and responsiveness."
      ]
    },
    "recovery": {
      "type": "result",
      "severity": "moderate",
      "title": "Breathing, unresponsive: recovery position",
      "steps": [
        "Roll the person onto their side.",
        "Tilt the head back slightly to keep the airway open.",
        "Bend the top knee to stabilize the body.",
        "Monitor breathing continuously until help arrives.",
        "Call/send for emergency help."
      ]
    },
    "no_breath": {
      "type": "result",
      "severity": "severe",
      "title": "Not breathing: begin CPR now",
      "steps": [
        "Call or send someone to call for emergency help immediately.",
        "Begin chest compressions: push hard and fast in the center of the chest, about 2 in (5 cm) deep, 100-120 per minute.",
        "Give 30 compressions, then 2 rescue breaths (tilt head, lift chin, pinch nose).",
        "Repeat 30:2 continuously until the person responds, breathes normally, or help arrives.",
        "Use an AED immediately if one is available - follow its voice prompts."
      ],
      "notdo": [
        "Don't stop compressions for long to search for a pulse.",
        "Don't tilt the head back forcefully if a neck/spinal injury is suspected - use a jaw-thrust instead if trained.",
        "Don't give up - continue CPR until help arrives or the person recovers."
      ]
    }
  },
  "bleeding": {
    "start": {
      "type": "q",
      "text": "Is blood spurting, pumping, or pooling rapidly?",
      "options": [
        {
          "label": "Yes, severe/rapid",
          "next": "severe"
        },
        {
          "label": "No, slow or oozing",
          "next": "moderate_q"
        }
      ]
    },
    "moderate_q": {
      "type": "q",
      "text": "Does the bleeding stop with a few minutes of firm direct pressure?",
      "options": [
        {
          "label": "Yes, it slows/stops",
          "next": "mild"
        },
        {
          "label": "No, it keeps bleeding",
          "next": "severe"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Minor bleeding",
      "steps": [
        "Clean the wound with clean water if available.",
        "Apply direct pressure with a clean cloth until bleeding stops.",
        "Apply antiseptic if available and cover with a clean bandage.",
        "Watch for signs of infection over the following days (redness, swelling, warmth, pus)."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Severe bleeding: act fast",
      "steps": [
        "Apply firm, direct pressure on the wound with the cleanest cloth available.",
        "If bleeding soaks through, add more layers on top - do not remove the original dressing.",
        "For a life-threatening limb wound that won't stop, apply a tourniquet 2-3 in (5-8 cm) above the wound (not on a joint). Note the time it was applied.",
        "Keep the person still; elevate the injury above heart level if possible and no fracture is suspected.",
        "Treat for shock (see Shock) and get emergency help immediately."
      ],
      "notdo": [
        "Don't remove an embedded object - pack and bandage around it instead.",
        "Don't loosen or remove a tourniquet once applied.",
        "Don't repeatedly lift the dressing to check the wound - it disrupts clotting."
      ]
    }
  },
  "choking": {
    "start": {
      "type": "q",
      "text": "Can the person cough forcefully, speak, or breathe at all?",
      "options": [
        {
          "label": "Yes, some air movement",
          "next": "mild"
        },
        {
          "label": "No, silent and can't breathe",
          "next": "severe"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Partial airway obstruction",
      "steps": [
        "Encourage the person to keep coughing forcefully - this is the body's best way to clear it.",
        "Stay with them and stay calm.",
        "If it worsens to a silent, complete blockage, move to the severe steps immediately."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Complete airway obstruction",
      "steps": [
        "Stand behind the person, lean them forward.",
        "Give 5 firm back blows between the shoulder blades with the heel of your hand.",
        "If unresolved, give 5 abdominal thrusts (Heimlich maneuver): fist above navel, grasp with other hand, thrust sharply inward/upward.",
        "Alternate 5 back blows and 5 abdominal thrusts until the object clears or the person becomes unresponsive.",
        "If they become unresponsive, lower them to the ground and begin CPR - check the mouth for the object before rescue breaths."
      ],
      "notdo": [
        "Don't perform blind finger sweeps of the mouth.",
        "For infants, use back blows and chest thrusts instead of abdominal thrusts.",
        "Don't leave the person alone to go find help unless absolutely necessary."
      ]
    }
  },
  "burns": {
    "start": {
      "type": "q",
      "text": "Is the skin charred, white/leathery, or is the burn larger than the person's hand?",
      "options": [
        {
          "label": "Yes",
          "next": "severe"
        },
        {
          "label": "No",
          "next": "blister_q"
        }
      ]
    },
    "blister_q": {
      "type": "q",
      "text": "Are there blisters present?",
      "options": [
        {
          "label": "Yes, blistering",
          "next": "moderate"
        },
        {
          "label": "No, just red/painful skin",
          "next": "mild"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Minor (first-degree) burn",
      "steps": [
        "Cool under clean running water for 10-20 minutes.",
        "Cover loosely with a clean, non-stick dressing.",
        "Give pain relief if available and appropriate.",
        "Do not apply ice directly."
      ]
    },
    "moderate": {
      "type": "result",
      "severity": "moderate",
      "title": "Moderate (second-degree) burn",
      "steps": [
        "Cool with clean water for about 20 minutes.",
        "Cover loosely with a clean, non-stick dressing - do not wrap tightly.",
        "Do not pop or drain blisters.",
        "Seek medical care if the burn is on the face, hands, feet, joints, or genitals, or is larger than a few inches."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Severe (third-degree) burn: emergency",
      "steps": [
        "Call/send for emergency help immediately.",
        "Do not remove clothing stuck to the burn.",
        "Cover loosely with a clean, dry cloth.",
        "Watch closely for signs of shock and treat if present.",
        "Keep the person warm and still while awaiting evacuation."
      ],
      "notdo": [
        "Don't apply ice, butter, oil, or ointments to any burn.",
        "Don't pop blisters.",
        "Don't peel away clothing that is stuck to burned skin."
      ]
    }
  },
  "fracture": {
    "start": {
      "type": "q",
      "text": "Is the bone visibly deformed, poking through the skin, or is the limb completely unusable?",
      "options": [
        {
          "label": "Yes, obvious/open fracture",
          "next": "severe"
        },
        {
          "label": "No",
          "next": "moderate_q"
        }
      ]
    },
    "moderate_q": {
      "type": "q",
      "text": "Is there significant swelling, bruising, or pain when moving it?",
      "options": [
        {
          "label": "Yes",
          "next": "moderate"
        },
        {
          "label": "No, mild tenderness only",
          "next": "mild"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Possible sprain/strain",
      "steps": [
        "Rest the area - avoid using it.",
        "Ice or cool-cloth for 20 minutes at a time.",
        "Compress lightly with an elastic wrap.",
        "Elevate above heart level when possible.",
        "Monitor - if pain/swelling worsens, treat as moderate."
      ]
    },
    "moderate": {
      "type": "result",
      "severity": "moderate",
      "title": "Suspected fracture (closed)",
      "steps": [
        "Immobilize the limb in the position it's in using a splint (see Splinting guide).",
        "Apply RICE: Rest, Ice, Compression, Elevation.",
        "Avoid putting weight on the injury.",
        "Seek medical care as soon as possible."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Severe or open fracture",
      "steps": [
        "Do not try to straighten or push the bone back in.",
        "Control any bleeding around the wound with gentle direct pressure away from the bone.",
        "Immobilize the limb in the position found - support above and below the injury (see Splinting guide).",
        "Treat for shock and monitor closely.",
        "Get emergency help / evacuate as soon as possible - do not let the person walk on it."
      ],
      "notdo": [
        "Don't try to realign or push a protruding bone back under the skin.",
        "Don't test the injury by having them 'walk it off'.",
        "Don't move the person more than necessary."
      ]
    }
  },
  "hypothermia": {
    "start": {
      "type": "q",
      "text": "Is the person shivering but alert, talking normally, and coordinated?",
      "options": [
        {
          "label": "Yes",
          "next": "mild"
        },
        {
          "label": "No",
          "next": "q2"
        }
      ]
    },
    "q2": {
      "type": "q",
      "text": "Are they confused, stumbling, or slurring words - but still shivering?",
      "options": [
        {
          "label": "Yes",
          "next": "moderate"
        },
        {
          "label": "No - shivering has stopped, very unresponsive, or muscles rigid",
          "next": "severe"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Mild hypothermia",
      "steps": [
        "Move to a warm, dry, sheltered place.",
        "Remove wet clothing and replace with dry, insulating layers.",
        "Give warm, sweet fluids only if fully alert.",
        "Encourage light movement to generate body heat."
      ]
    },
    "moderate": {
      "type": "result",
      "severity": "moderate",
      "title": "Moderate hypothermia",
      "steps": [
        "Move to shelter urgently and handle the person gently.",
        "Remove wet clothing; insulate fully including the head, using dry layers or a sleeping bag.",
        "Apply warmth to the core first: warm packs or skin-to-skin contact at neck, chest, and groin.",
        "Do not give food or drink unless they are fully alert and able to swallow safely.",
        "Evacuate for medical care as soon as possible."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Severe hypothermia: life-threatening",
      "steps": [
        "Handle extremely gently - rough movement can trigger cardiac arrest.",
        "Insulate the whole body, including the head; prevent further heat loss.",
        "Do not actively rewarm rapidly or massage limbs.",
        "Do not give food or fluids.",
        "Check breathing carefully for a full minute - begin CPR only if truly no breathing.",
        "Evacuate for emergency medical care immediately."
      ],
      "notdo": [
        "Don't rub or massage cold extremities.",
        "Don't give alcohol - it worsens heat loss.",
        "Don't immerse in hot water or attempt rapid rewarming for moderate/severe cases.",
        "Don't assume a very cold, still person is dead - hypothermia can mimic death; continue care."
      ]
    }
  },
  "heat": {
    "start": {
      "type": "q",
      "text": "Is the skin hot and dry (or barely sweaty) with confusion, seizure, or unconsciousness?",
      "options": [
        {
          "label": "Yes - heat stroke signs",
          "next": "heatstroke"
        },
        {
          "label": "No",
          "next": "q2"
        }
      ]
    },
    "q2": {
      "type": "q",
      "text": "Heavy sweating with cool/clammy skin, dizziness, nausea, or headache?",
      "options": [
        {
          "label": "Yes",
          "next": "heatexhaustion"
        },
        {
          "label": "No, just mild discomfort",
          "next": "mild"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Mild heat stress",
      "steps": [
        "Move to shade or a cooler area.",
        "Hydrate with water.",
        "Rest and loosen clothing.",
        "Avoid further exertion in the heat."
      ]
    },
    "heatexhaustion": {
      "type": "result",
      "severity": "moderate",
      "title": "Heat exhaustion",
      "steps": [
        "Move to a cool, shaded area immediately.",
        "Remove excess clothing; cool the skin with wet cloths and fanning.",
        "Sip water or an electrolyte drink if fully alert.",
        "Rest until symptoms fully resolve.",
        "Seek medical care if not improving within 30 minutes."
      ]
    },
    "heatstroke": {
      "type": "result",
      "severity": "severe",
      "title": "Heat stroke: life-threatening emergency",
      "steps": [
        "Call/send for emergency help immediately.",
        "Cool aggressively: ice packs or cold wet cloths at neck, armpits, and groin; immerse in cool water if possible.",
        "Do not give fluids by mouth if the person is not fully alert.",
        "Monitor breathing and responsiveness closely until help arrives."
      ],
      "notdo": [
        "Don't give fluids to someone who isn't fully alert (choking/aspiration risk).",
        "Don't wait to see if heat stroke signs pass on their own - it can be fatal within minutes.",
        "Don't use ice-water immersion for mild heat stress - reserve aggressive cooling for heat stroke."
      ]
    }
  },
  "dehydration": {
    "start": {
      "type": "q",
      "text": "Is the person confused, not urinating, or having a rapid weak pulse/fainting?",
      "options": [
        {
          "label": "Yes",
          "next": "severe"
        },
        {
          "label": "No",
          "next": "q2"
        }
      ]
    },
    "q2": {
      "type": "q",
      "text": "Noticeable thirst, dry mouth, dark yellow urine, or fatigue?",
      "options": [
        {
          "label": "Yes",
          "next": "moderate"
        },
        {
          "label": "No, just mild thirst",
          "next": "mild"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Mild dehydration",
      "steps": [
        "Drink water steadily, small amounts often.",
        "Rest in the shade.",
        "Monitor urine color - aim for pale yellow."
      ]
    },
    "moderate": {
      "type": "result",
      "severity": "moderate",
      "title": "Moderate dehydration",
      "steps": [
        "Rehydrate with water plus electrolytes; a pinch of salt and sugar per liter can help if no electrolyte mix is available.",
        "Rest and avoid further exertion.",
        "Continue monitoring - progress to severe steps if symptoms worsen."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Severe dehydration: emergency",
      "steps": [
        "This requires medical care - begin evacuation.",
        "If conscious and able to swallow, give oral rehydration solution slowly and steadily, not large amounts at once.",
        "Keep the person cool and still.",
        "Watch closely for worsening confusion or loss of consciousness."
      ],
      "notdo": [
        "Don't gulp large volumes of water quickly - it can cause vomiting.",
        "Don't drink seawater or urine to rehydrate - it worsens dehydration.",
        "Don't ignore dark urine combined with confusion - treat as severe."
      ]
    }
  },
  "snakebite": {
    "start": {
      "type": "q",
      "text": "Do you know with certainty the snake was non-venomous?",
      "options": [
        {
          "label": "Yes, certain",
          "next": "mild"
        },
        {
          "label": "No / unsure",
          "next": "assess"
        }
      ]
    },
    "assess": {
      "type": "q",
      "text": "Is there rapidly spreading swelling, severe pain, vomiting, trouble breathing, or drooping eyelids?",
      "options": [
        {
          "label": "Yes",
          "next": "severe"
        },
        {
          "label": "No, mild local pain/swelling only so far",
          "next": "moderate"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Non-venomous bite",
      "steps": [
        "Clean the wound with water.",
        "Cover with a clean dressing.",
        "Still seek medical evaluation when possible."
      ]
    },
    "moderate": {
      "type": "result",
      "severity": "moderate",
      "title": "Possible venomous bite",
      "steps": [
        "Keep the person calm and as still as possible - movement spreads venom faster.",
        "Keep the bitten limb below heart level.",
        "Remove rings, watches, or tight clothing near the bite before swelling worsens.",
        "Mark the edge of swelling and the time, and recheck every 15 minutes.",
        "Get to medical care as soon as possible."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Severe envenomation: emergency",
      "steps": [
        "Call/send for emergency help immediately.",
        "Keep the person still and calm - carry them if possible rather than letting them walk.",
        "Immobilize the bitten limb below heart level, similar to a fracture splint.",
        "Evacuate urgently - antivenom is time-critical."
      ],
      "notdo": [
        "Don't cut the wound.",
        "Don't try to suck out the venom.",
        "Don't apply a tight tourniquet or ice.",
        "Don't try to catch or kill the snake - a photo from a safe distance is enough for identification."
      ]
    }
  },
  "shock": {
    "start": {
      "type": "q",
      "text": "Is the skin pale, cool, and clammy with a rapid weak pulse and confusion?",
      "options": [
        {
          "label": "Yes",
          "next": "severe"
        },
        {
          "label": "No, but there's a recent injury/blood loss/burn",
          "next": "monitor"
        }
      ]
    },
    "monitor": {
      "type": "result",
      "severity": "moderate",
      "title": "Watch for shock",
      "steps": [
        "Keep monitoring closely - shock can develop after injury, blood loss, or burns.",
        "Keep the person calm, warm, and still.",
        "Treat the underlying injury (bleeding, burn, fracture).",
        "Recheck skin color, pulse, and alertness frequently."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Shock: emergency",
      "steps": [
        "Call/send for emergency help immediately.",
        "Lay the person down and elevate the legs about 12 in (30 cm), unless a head, spinal, or leg injury is suspected.",
        "Keep them warm with a blanket and treat any obvious cause such as bleeding.",
        "Do not give food or water.",
        "Monitor breathing and responsiveness continuously until help arrives."
      ],
      "notdo": [
        "Don't give food or drink.",
        "Don't leave the person alone.",
        "Don't elevate the legs if a head, spinal, or leg fracture is suspected."
      ]
    }
  },
  "allergic": {
    "start": {
      "type": "q",
      "text": "Swelling of the face/throat, trouble breathing or swallowing, or widespread hives with dizziness?",
      "options": [
        {
          "label": "Yes - severe reaction",
          "next": "severe"
        },
        {
          "label": "No, localized itching/hives only",
          "next": "mild"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "mild",
      "title": "Mild allergic reaction",
      "steps": [
        "Give an antihistamine if available and appropriate.",
        "Remove the trigger if known (e.g., stinger, contact source).",
        "Monitor closely for 30-60 minutes for signs of progression to a severe reaction."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Anaphylaxis: life-threatening emergency",
      "steps": [
        "Use an epinephrine auto-injector immediately if available - inject into the outer thigh.",
        "Call/send for emergency help right away.",
        "Lay the person flat with legs raised, unless breathing is difficult, in which case let them sit up.",
        "Be ready to give a second epinephrine dose after 5-15 minutes if there's no improvement.",
        "Begin CPR immediately if they become unresponsive or stop breathing."
      ],
      "notdo": [
        "Don't wait to see if it improves before using epinephrine.",
        "Don't have the person stand or walk suddenly - it can cause a fatal drop in blood pressure.",
        "Don't rely on an oral antihistamine alone for a severe reaction - it is not a substitute for epinephrine."
      ]
    }
  },
  "cardiac": {
    "start": {
      "type": "q",
      "text": "Is the person unresponsive, or not breathing normally?",
      "options": [
        {
          "label": "Yes - unresponsive or not breathing",
          "next": "no_breath",
          "flow": "breathing"
        },
        {
          "label": "No - awake and breathing, but has chest pain or pressure",
          "next": "conscious"
        }
      ]
    },
    "conscious": {
      "type": "result",
      "severity": "severe",
      "title": "Possible heart attack: treat as an emergency",
      "steps": [
        "Call/send for emergency help immediately - do not wait to see if it passes.",
        "Have the person stop all activity and rest in a calm, comfortable position, usually sitting.",
        "Loosen any tight clothing around the neck and chest.",
        "If they have their own medication prescribed for a heart condition (such as nitroglycerin), help them take it as directed.",
        "Stay with them and monitor closely - be ready to begin CPR if they become unresponsive or stop breathing."
      ],
      "notdo": [
        "Don't let them walk around, drive themselves, or wait to see if it passes - get emergency help moving right away.",
        "Don't give aspirin or any medication unless it's their own prescribed medication or a dispatcher tells you to.",
        "Don't leave them alone."
      ]
    }
  },
  "breathing_distress": {
    "start": {
      "type": "q",
      "text": "Are they still breathing at all, even weakly?",
      "options": [
        {
          "label": "No - not breathing, or only gasping",
          "next": "no_breath",
          "flow": "breathing"
        },
        {
          "label": "Yes - breathing but struggling",
          "next": "struggling"
        }
      ]
    },
    "struggling": {
      "type": "result",
      "severity": "severe",
      "title": "Trouble breathing: get help",
      "steps": [
        "Call/send for emergency help, especially if this is sudden, severe, or getting worse.",
        "Help them sit upright, leaning slightly forward - this is easier than lying down.",
        "Loosen tight clothing around the neck and chest.",
        "If they have a prescribed rescue inhaler or medication for a breathing condition, help them use it as directed.",
        "Stay calm and stay with them - anxiety can make breathing difficulty worse.",
        "Watch closely for lips or face turning blue, or increasing confusion - these mean it's getting more severe."
      ],
      "notdo": [
        "Don't have them lie flat.",
        "Don't leave them alone.",
        "Don't wait to call for help if breathing is severely labored or they can barely speak."
      ]
    }
  },
  "poison": {
    "start": {
      "type": "menu",
      "title": "How did the exposure happen?",
      "items": [
        {
          "label": "Swallowed",
          "go": "poison:swallowed"
        },
        {
          "label": "Inhaled fumes or gas",
          "go": "poison:inhaled"
        },
        {
          "label": "On skin or in eyes",
          "go": "poison:contact"
        }
      ]
    },
    "swallowed": {
      "type": "result",
      "severity": "severe",
      "title": "Swallowed a poison or chemical",
      "steps": [
        "Call Poison Control (US: 1-800-222-1222) or emergency services immediately - have the container or substance name ready if possible.",
        "Follow their instructions exactly - what's safe to do depends entirely on what was swallowed.",
        "If the person becomes unresponsive or stops breathing, call/send for emergency help and begin CPR if needed."
      ],
      "notdo": [
        "Don't induce vomiting unless specifically told to by Poison Control or a medical professional - for some substances it can cause more harm.",
        "Don't give anything to eat or drink unless instructed to."
      ]
    },
    "inhaled": {
      "type": "result",
      "severity": "severe",
      "title": "Inhaled fumes, smoke, or gas",
      "steps": [
        "Get the person to fresh air immediately - open windows/doors on your way out if it's quick to do.",
        "Call/send for emergency help.",
        "If you smell gas (rotten-egg smell) or suspect carbon monoxide, don't use light switches, lighters, or anything that could spark - leave the area first.",
        "Monitor breathing closely and begin CPR if they stop breathing."
      ],
      "notdo": [
        "Don't re-enter a gas-filled or smoke-filled space to search for anyone without protection and backup - call emergency services instead."
      ]
    },
    "contact": {
      "type": "result",
      "severity": "moderate",
      "title": "Chemical on skin or in eyes",
      "steps": [
        "Remove any contaminated clothing.",
        "Flush the affected skin or eyes with clean, lukewarm running water for at least 15-20 minutes.",
        "Call Poison Control (US: 1-800-222-1222) or seek medical care, especially for eye exposure or if irritation is severe.",
        "Keep flushing even while waiting for advice or help to arrive."
      ],
      "notdo": [
        "Don't rub the eyes.",
        "Don't apply neutralizing chemicals unless specifically instructed by Poison Control."
      ]
    }
  },
  "fireemergency": {
    "start": {
      "type": "menu",
      "title": "What kind of fire?",
      "items": [
        {
          "label": "Building / structure fire",
          "go": "fireemergency:structure"
        },
        {
          "label": "Someone's clothing is on fire",
          "go": "fireemergency:clothing"
        },
        {
          "label": "Wildfire nearby",
          "go": "fireemergency:wildfire"
        }
      ]
    },
    "structure": {
      "type": "result",
      "severity": "severe",
      "title": "Structure fire: get out now",
      "steps": [
        "Get everyone out immediately - don't stop to gather belongings.",
        "Stay low under smoke - smoke and toxic gases rise.",
        "Before opening any closed door, feel it with the back of your hand - if it's hot, use another way out.",
        "Close doors behind you as you leave to slow the fire's spread.",
        "Go to your agreed meeting point outside and call/send for emergency help once you're safely out."
      ],
      "notdo": [
        "Don't go back inside for any reason, including pets or belongings.",
        "Don't use an elevator - use the stairs.",
        "Don't open a door that feels hot."
      ]
    },
    "clothing": {
      "type": "result",
      "severity": "severe",
      "title": "Clothing on fire: Stop, Drop, and Roll",
      "steps": [
        "Stop - don't run, it fans the flames.",
        "Drop to the ground.",
        "Cover your face with your hands if possible.",
        "Roll back and forth to smother the flames.",
        "Once out, cool the burned area with clean water and get emergency medical help - see First Aid > Burn for care."
      ],
      "notdo": [
        "Don't run - it makes flames worse.",
        "Don't use fabric to smother the flames unless it's specifically fire-resistant."
      ]
    },
    "wildfire": {
      "type": "result",
      "severity": "severe",
      "title": "Wildfire nearby: evacuate early",
      "steps": [
        "Leave as soon as evacuation is ordered or the fire is visibly approaching - don't wait to see how close it gets.",
        "Close windows and doors and shut off gas at the meter before leaving if you have time.",
        "Take main roads and follow official evacuation routes.",
        "If trapped in a vehicle: stay inside, close windows/vents, turn on headlights, get down below window level, and cover yourself with a blanket or jacket.",
        "If trapped on foot: move to a cleared area away from vegetation and, if possible, downhill from the fire."
      ],
      "notdo": [
        "Don't wait to 'see how bad it gets' before leaving.",
        "Don't drive through heavy smoke if visibility is severely reduced - wait it out in a cleared area instead."
      ]
    }
  },
  "vehicleemergency": {
    "start": {
      "type": "menu",
      "title": "What's the vehicle situation?",
      "items": [
        {
          "label": "Crash / collision",
          "go": "vehicleemergency:crash"
        },
        {
          "label": "Broken down on the road",
          "go": "vehicleemergency:breakdown"
        },
        {
          "label": "Stuck (mud, sand, snow)",
          "go": "vehicleemergency:stuck"
        },
        {
          "label": "Sinking / submerged in water",
          "go": "vehicleemergency:submerged"
        }
      ]
    },
    "crash": {
      "type": "result",
      "severity": "severe",
      "title": "Vehicle crash",
      "steps": [
        "Check yourself and passengers for injuries before moving anyone.",
        "If anyone is seriously injured, don't move them unless staying puts them in immediate danger (fire, traffic) - call/send for emergency help.",
        "If the vehicle is drivable and it's safe, move it to the shoulder; otherwise turn on hazard lights and stay clear of traffic.",
        "Exchange information with other involved drivers if everyone is safe to do so.",
        "Call emergency services - most places require reporting a crash with injury or significant damage."
      ],
      "notdo": [
        "Don't move a seriously injured person unless staying puts them in immediate danger.",
        "Don't stand between vehicles or in traffic lanes to talk or exchange information."
      ]
    },
    "breakdown": {
      "type": "result",
      "severity": "moderate",
      "title": "Breakdown on the road",
      "steps": [
        "Pull as far off the roadway as possible and turn on hazard lights.",
        "If available, place flares or reflective triangles behind the vehicle.",
        "If it's safer, exit away from traffic to a location off the road; otherwise stay inside with your seatbelt on.",
        "Call for roadside assistance, or emergency help if you're somewhere dangerous (highway shoulder, blind curve, unlit at night)."
      ],
      "notdo": [
        "Don't stand between your vehicle and passing traffic.",
        "Don't attempt repairs on the traffic side of the vehicle."
      ]
    },
    "stuck": {
      "type": "result",
      "severity": "moderate",
      "title": "Stuck in mud, sand, or snow",
      "steps": [
        "Stop spinning the wheels - it digs you in deeper.",
        "Clear debris, sand, or snow from around the tires.",
        "Use traction aids if available: boards, floor mats, or sand/gravel under the tires.",
        "Gently rock the vehicle forward and back if it's safe to do so.",
        "If stuck in snow and can't free the vehicle, stay with it - it's far easier for rescuers to find than a person on foot. Run the engine about 10 minutes each hour for heat, cracking a window for ventilation, and make sure the exhaust pipe is clear of snow first (carbon monoxide risk)."
      ],
      "notdo": [
        "Don't keep spinning the wheels.",
        "Don't run the engine for heat without cracking a window and checking the exhaust pipe is clear - carbon monoxide can build up fast in a snowed-in vehicle.",
        "Don't leave the vehicle to walk for help in severe weather unless you know help is very close - staying with it is usually safer."
      ]
    },
    "submerged": {
      "type": "result",
      "severity": "severe",
      "title": "Vehicle sinking or submerged",
      "steps": [
        "Unbuckle your seatbelt immediately.",
        "Open a window or break it right away, before the vehicle fully submerges - power windows and doors can fail once underwater.",
        "Get children or the lightest occupants out first through the window.",
        "Once out, swim to the surface and away from the vehicle, then call/send for emergency help."
      ],
      "notdo": [
        "Don't wait for the vehicle to fill with water before trying to exit - escape early, while windows and doors may still work."
      ]
    }
  },
  "lost": {
    "start": {
      "type": "result",
      "severity": "moderate",
      "title": "Lost or stranded: S.T.O.P.",
      "steps": [
        "Stop moving as soon as you realize you're lost - continuing to wander usually makes it harder to be found.",
        "Think - stay calm, take stock of what you have, and avoid panicked decisions.",
        "Observe your surroundings, the time of day, weather, and any landmarks or trail signs nearby.",
        "Plan - if you told someone your route and time, staying put is usually the safest option since it's easier for searchers to find a stationary person.",
        "Signal your location if you can: whistle, mirror, bright clothing, or the Signaling guide's SOS pattern.",
        "If night is falling or weather is worsening, prioritize shelter (see Shelter) before it gets dark."
      ],
      "notdo": [
        "Don't keep moving aimlessly once you know you're lost.",
        "Don't split up a group to search in different directions.",
        "Don't drain a phone battery searching for signal in one spot - move to higher, open ground once, then conserve power."
      ]
    }
  },
  "waterincident": {
    "start": {
      "type": "menu",
      "title": "Water emergency",
      "items": [
        {
          "label": "Someone is struggling in the water now",
          "go": "waterincident:rescue"
        },
        {
          "label": "Someone was just pulled from the water",
          "go": "waterincident:check"
        }
      ]
    },
    "rescue": {
      "type": "result",
      "severity": "severe",
      "title": "Person in the water: reach or throw, don't go",
      "steps": [
        "Call/send for emergency help immediately.",
        "Reach or throw something that floats - a rope, life ring, cooler, or branch - rather than entering the water yourself.",
        "Only enter the water to help if you're trained in water rescue - a struggling swimmer can pull a rescuer under too.",
        "Once they're out, check if they're breathing normally - if not, begin CPR immediately."
      ],
      "notdo": [
        "Don't swim out for an untrained rescue unless there's truly no other option - two people in danger is worse than one.",
        "Don't waste time removing wet clothing before starting CPR if they're not breathing."
      ]
    },
    "check": {
      "type": "q",
      "text": "Are they breathing normally now?",
      "options": [
        {
          "label": "No - not breathing or only gasping",
          "next": "no_breath",
          "flow": "breathing"
        },
        {
          "label": "Yes - breathing and responsive",
          "next": "outofwater"
        }
      ]
    },
    "outofwater": {
      "type": "result",
      "severity": "moderate",
      "title": "After a water rescue: keep watching",
      "steps": [
        "Get them warm and dry - treat for hypothermia if they've been in cold water (see Cold exposure/hypothermia).",
        "Keep monitoring their breathing closely for the next 24 hours, even if they seem fine now.",
        "Seek medical care if you notice persistent coughing, trouble breathing, extreme tiredness, or confusion in the hours after - these can be signs of a delayed reaction to water in the lungs."
      ],
      "notdo": [
        "Don't assume someone is fine just because they're conscious and coughed the water out.",
        "If you didn't witness the whole incident, get them checked by a medical professional regardless of how they seem."
      ]
    }
  },
  "other": {
    "start": {
      "type": "result",
      "severity": "info",
      "forceCall": true,
      "title": "Not sure what to call it?",
      "steps": [
        "If there's any threat to life, call for emergency help now.",
        "If you can describe what's wrong, try the search bar at the top for a specific symptom or situation.",
        "Otherwise, browse the full First Aid and category guides below for step-by-step guidance."
      ]
    }
  },
  "seizure": {
    "start": {
      "type": "q",
      "text": "Has it lasted more than 5 minutes, or are there repeated seizures without waking up in between?",
      "options": [
        {
          "label": "Yes - 5+ minutes, or repeated without waking",
          "next": "prolonged"
        },
        {
          "label": "No - a single episode, still going or just ended",
          "next": "typical"
        }
      ]
    },
    "typical": {
      "type": "result",
      "severity": "moderate",
      "title": "Seizure: protect them, time it, don't restrain",
      "steps": [
        "Ease them to the floor and clear the area of anything hard or sharp.",
        "Cushion their head with something soft.",
        "Time the seizure from when it starts.",
        "Once the jerking movements stop, roll them onto their side to keep the airway clear.",
        "Stay with them until they're fully alert - they're often confused for a while afterward.",
        "Get medical care afterward if this is their first seizure, or call for help if it lasted more than 5 minutes, they were injured, or don't wake up fully."
      ],
      "notdo": [
        "Don't hold them down or try to stop the movements.",
        "Don't put anything in their mouth - they cannot swallow their tongue, and this can injure them or you.",
        "Don't give food or water until they're fully alert."
      ]
    },
    "prolonged": {
      "type": "result",
      "severity": "severe",
      "title": "Prolonged or repeated seizure: emergency",
      "steps": [
        "Call/send for emergency help immediately - a seizure lasting more than 5 minutes, or repeated seizures without waking in between, needs urgent care.",
        "Ease them to the floor, clear the area of anything hard or sharp, and cushion their head.",
        "Once the jerking stops (or between seizures), roll them onto their side to keep the airway clear.",
        "Keep timing it and stay with them until help arrives."
      ],
      "notdo": [
        "Don't hold them down or restrain the movements.",
        "Don't put anything in their mouth.",
        "Also call for help if this is a first-ever seizure, happened in water, or the person is injured, pregnant, or diabetic and isn't waking up."
      ]
    }
  },
  "electrical": {
    "start": {
      "type": "q",
      "text": "Is the person still touching the power source or a downed power line?",
      "options": [
        {
          "label": "Yes - still in contact",
          "next": "stillcontact"
        },
        {
          "label": "No - the power is off or they're no longer in contact",
          "next": "safe"
        }
      ]
    },
    "stillcontact": {
      "type": "result",
      "severity": "severe",
      "title": "Don't touch them yet - the power may still be live",
      "steps": [
        "Do not touch the person directly - you can be electrocuted too.",
        "If possible, cut the power at the source first (breaker, switch, or unplug it).",
        "If you can't shut off the power, call/send for emergency help and stay well back - for a downed power line, treat the ground itself as electrified for a wide radius around it and the vehicle/object it's touching.",
        "Only move them once you're certain the power is off, and even then only using something dry and non-conductive (wood, plastic) if you must."
      ],
      "notdo": [
        "Don't touch the person, water, or anything metal near them while the source may still be live.",
        "Don't approach a downed power line, even if it looks dead or isn't sparking."
      ]
    },
    "safe": {
      "type": "result",
      "severity": "severe",
      "title": "Electrical injury: get emergency help",
      "steps": [
        "Call/send for emergency help - electrical injury can cause serious internal damage even when it looks minor from the outside.",
        "Check breathing and begin CPR immediately if they're not breathing.",
        "Cover any visible burns loosely with a clean, dry dressing (see Burn).",
        "Keep them still and monitor closely until help arrives, even if they seem fine."
      ],
      "notdo": [
        "Don't assume they're okay just because they're conscious and talking - internal injury isn't always visible.",
        "Don't apply anything to burns other than a clean, dry covering."
      ]
    }
  },
  "frostbite": {
    "start": {
      "type": "q",
      "text": "Is the skin hard, waxy-white, and numb - not just cold and red?",
      "options": [
        {
          "label": "Yes - hard, white/waxy, numb",
          "next": "severe"
        },
        {
          "label": "No - cold and red or pale, but still soft with some feeling",
          "next": "mild"
        }
      ]
    },
    "mild": {
      "type": "result",
      "severity": "moderate",
      "title": "Early frostbite / frostnip",
      "steps": [
        "Get out of the cold and into shelter.",
        "Remove wet or tight clothing, rings, and jewelry near the area.",
        "Rewarm gently with body heat (e.g., tuck hands in armpits) or lukewarm - not hot - water.",
        "Watch for numbness or hardening skin - that means it's progressing, so switch to the severe steps if so."
      ],
      "notdo": [
        "Don't rub or massage the skin.",
        "Don't use direct dry heat like a fire, heater, or hot water bottle - numb skin can burn before you feel it."
      ]
    },
    "severe": {
      "type": "result",
      "severity": "severe",
      "title": "Frostbite: get to medical care",
      "steps": [
        "Get to shelter and out of the cold.",
        "Remove wet or tight clothing and jewelry near the area.",
        "Only rewarm in warm - not hot - water, around 100-105°F (37-40°C), for 15-30 minutes, and only if you're confident it won't refreeze before you reach lasting warmth. Refreezing causes worse damage than waiting.",
        "Loosely bandage with clean, dry gauze, separating fingers or toes, once rewarmed.",
        "Get medical care as soon as possible - deep frostbite can cause lasting tissue damage."
      ],
      "notdo": [
        "Don't rub or massage the frostbitten area.",
        "Don't rewarm it if there's a real chance it could refreeze before you're somewhere warm for good.",
        "Don't use direct dry heat (fire, heater) or break any blisters that form."
      ]
    }
  },
  "headspinal": {
    "start": {
      "type": "result",
      "severity": "severe",
      "title": "Suspected head or spinal injury: keep them still",
      "steps": [
        "Call/send for emergency help.",
        "Keep the person as still as possible - support their head and neck in the position you found them, without trying to straighten or realign it.",
        "If you must move them because of immediate danger (fire, traffic, rising water), move the head, neck, and body together as one unit rather than letting the head twist.",
        "Watch for and report to responders: loss of consciousness, vomiting, worsening headache, confusion, unequal pupil size, seizure, clear fluid from the nose or ears, or weakness/numbness/tingling in the arms or legs.",
        "If they're not breathing, they still need CPR - use a jaw-thrust instead of tilting the head back if you're trained to."
      ],
      "notdo": [
        "Don't move them unless there's immediate danger of further harm.",
        "Don't remove a helmet unless you're trained to and it's blocking the airway.",
        "Don't let them get up and \"walk it off\" after a hard fall or blow to the head, even if they seem fine at first."
      ]
    }
  }
};

export const QUICK_REF: { t: string; d: string }[] = [
  {
    "t": "Severe bleeding",
    "d": "Direct firm pressure. If life-threatening on a limb, tourniquet 2-3 in above the wound; note the time."
  },
  {
    "t": "SOS signal",
    "d": "3 short, 3 long, 3 short - by whistle, flashlight, or mirror flashes."
  },
  {
    "t": "Water purification",
    "d": "8 drops unscented bleach per gallon (clear water), double if cloudy - wait 30 min. Or boil 1 min (3 min above 6,500 ft)."
  },
  {
    "t": "Hypothermia stages",
    "d": "Mild: shivering, alert. Moderate: confused, stumbling. Severe: shivering stops, unresponsive - handle very gently."
  },
  {
    "t": "Heat stroke",
    "d": "Hot/dry skin + confusion or seizure = emergency. Cool aggressively now, call for help."
  },
  {
    "t": "Lightning: 30-30 rule",
    "d": "Shelter if thunder follows lightning in under 30 sec. Wait 30 min after the last thunder before going back out."
  },
  {
    "t": "Rule of 3s",
    "d": "3 min without air, 3 hrs without shelter in harsh exposure, 3 days without water, 3 weeks without food."
  },
  {
    "t": "Choking",
    "d": "5 back blows, then 5 abdominal thrusts. Alternate until clear or person becomes unresponsive."
  },
  {
    "t": "Flood water",
    "d": "Never cross moving water: 6 in can knock you down, 12-24 in can float a vehicle."
  },
  {
    "t": "Shadow-stick north",
    "d": "Mark shadow tip, wait 15-20 min, mark again. First-to-second mark line runs roughly west to east; perpendicular = north-south."
  }
];

export const GROUND_SIGNALS: { sym: string; meaning: string }[] = [
  {
    "sym": "V",
    "meaning": "Require assistance"
  },
  {
    "sym": "X",
    "meaning": "Require medical assistance"
  },
  {
    "sym": "N",
    "meaning": "No / negative"
  },
  {
    "sym": "Y",
    "meaning": "Yes / affirmative"
  },
  {
    "sym": "↑",
    "meaning": "Proceeding in this direction"
  },
  {
    "sym": "F",
    "meaning": "Need food and water"
  },
  {
    "sym": "■■",
    "meaning": "All is well"
  }
];

export const BANDAGE_STEPS: string[] = [
  "Step 1: Expose the wound and apply a clean dressing directly over it.",
  "Step 2: Press the dressing firmly with your palm to apply direct pressure.",
  "Step 3: Wrap a bandage snugly around the limb, over the dressing, working outward from the wound.",
  "Step 4: Secure the end, check circulation past the bandage, and elevate the injury if possible."
];
export const SPLINT_STEPS: string[] = [
  "Step 1: Support the injured limb above and below the injury without straightening it.",
  "Step 2: Place padding along the limb, then lay a rigid support (stick, pole, or board) alongside it.",
  "Step 3: Tie the splint in place at several points - above the injury, below it, but never directly over it.",
  "Step 4: Check that fingers/toes stay warm, pink, and can feel touch. Support or sling the limb and keep the person still."
];

export const FIRST_AID_MYTHS: string[] = [
  "Don't suck out snake venom - it doesn't work and risks the helper.",
  "Don't rub or massage frostbitten skin - it damages tissue further.",
  "Don't remove an embedded object from a wound - stabilize it in place.",
  "Don't apply ice directly to a burn.",
  "Don't tilt a choking person's head back and give water.",
  "Don't move someone with a suspected spinal injury unless there's immediate danger."
];

export const EMERGENCY_NUMBERS: { region: string; num: string }[] = [
  {
    "region": "United States & Canada",
    "num": "911"
  },
  {
    "region": "European Union (all member states)",
    "num": "112"
  },
  {
    "region": "United Kingdom",
    "num": "999 or 112"
  },
  {
    "region": "Australia",
    "num": "000"
  },
  {
    "region": "New Zealand",
    "num": "111"
  },
  {
    "region": "India",
    "num": "112"
  },
  {
    "region": "Mexico",
    "num": "911"
  },
  {
    "region": "Japan",
    "num": "110 (police), 119 (fire/ambulance)"
  },
  {
    "region": "China",
    "num": "110 (police), 119 (fire), 120 (ambulance)"
  },
  {
    "region": "Brazil",
    "num": "190 (police), 192 (ambulance), 193 (fire)"
  }
];
export const EMERGENCY_ORGS: { name: string; contact: string; note: string }[] = [
  {
    "name": "American Red Cross",
    "contact": "1-800-733-2767 (1-800-RED-CROSS)",
    "note": "Disaster relief and shelter information. Their Emergency app can be downloaded in advance and used offline."
  },
  {
    "name": "FEMA Disaster Assistance (US)",
    "contact": "1-800-621-3362, or text 43362 (4FEMA)",
    "note": "Federal disaster assistance registration and information."
  },
  {
    "name": "Poison Control (US)",
    "contact": "1-800-222-1222",
    "note": "Routes to your regional poison control center automatically."
  },
  {
    "name": "211 (US & Canada)",
    "contact": "Dial 2-1-1",
    "note": "Free helpline for local non-emergency health and human services."
  },
  {
    "name": "Disaster Distress Helpline (US)",
    "contact": "1-800-985-5990, or text TalkWithUs to 66746",
    "note": "Crisis counseling for anyone experiencing distress related to a disaster."
  }
];
