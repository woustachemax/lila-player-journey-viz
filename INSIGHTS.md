# Insights

all the numbers here come from the cleaned data, 798 human journeys across 796 matches from feb 10 to 14. the grid figures are the 64x64 heatmap in the tool.

## 1. bots do almost all the killing and they do it early

Going through the death events there was barely any pvp. 403 of the 445 human deaths (91%) are to bots, 39 are to the storm and only 3 are to other players. The median bot death happens 4.3 minutes in while the median run lasts about 6 minutes, so most players who die go down early. Playback makes the reason obvious, the bots come out of a handful of spawns (5 grid cells hold 39% of the 268 bots on ambrose valley), they travel in small groups, and 75% of them are dead before the match is 90% done. So a bot heavy match is crowded for the first few minutes and close to empty after that.

The metrics this moves are early death rate (deaths before minute 5) and extraction rate, plus pvp encounters per match if pvp is meant to be part of the loop. I would spread the bot spawns out and thin them near landing areas so players get a few minutes to gear up before the first fight, and if pvp matters then loot and extraction routes need to overlap more so humans cross paths at all. Right now bots shape a run more than anything else on the map, so where bots spawn is level design as much as where the walls are.

## 2. most of the map never gets used

61% of the 64x64 grid on ambrose valley never records a single position sample, and its 73% on lockdown and 72% on grand rift. Some of that is terrain past the play boundary but plenty of it is interior, the eastern half of ambrose valley is 75 to 78% empty against 44 to 48% in the west. Deaths go the other way and pile into almost nothing, 5% of the grid holds every recorded death, the hottest cell has 9 of 316 sitting on a warehouse by the river bend and the second has 6 near the south edge, and both are top cells for kills too. Grand rift has named zones on the map art so the pattern is even easier to read there, mine pit dominates traffic and deaths while maintenance bay and gas station sit out at the corners and barely register on any layer.

The metrics here are map coverage and deaths per area. The two hot cells on ambrose valley need cover or a second way through, because a handful of squares killing this many players reads as a trap more than a fight. The dead eastern half either needs a reason to go there like better loot or a closer extraction, or its space the map could lose, and the same goes for maintenance bay and gas station which are far enough out that nothing currently justifies the walk. Space nobody visits is design time players never see.

## 3. the storm kills three times more people on lockdown, and not where i expected

Lockdown is the small close quarters map so i thought the storm would matter less there, its the opposite. 10% of lockdown runs end in a storm death (17 of 171) against 3% on ambrose valley (17 of 568), and the storm is 17% of all deaths on lockdown but only 5% on ambrose. My first guess was a blocked route or a bad exit, but the heatmap kills that idea, all 17 lockdown storm deaths land in 17 different cells with a median nearest neighbour of 0.043 map units, and they sit mid map (mean 0.55, 0.54) rather than at an edge, around minute 12.7. Lockdown also runs the longest matches with a 7.1 minute median against 5.9 on ambrose.

So its not one choke point, its players still standing in the middle when the timer runs out. The metrics are storm death rate, time to extract, and dwell time in the central area. I would check the storm timing and speed on lockdown against the other two maps, and look at whether the centre holds players too long because thats where the loot is, since playback shows everyone converging on the middle and then heading back out. Dying to the storm feels like the maps fault more than a lost fight, and on the smallest map in rotation it should be the hardest death to earn.