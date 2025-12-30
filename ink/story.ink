VAR coins = 0

VAR STR = 0
VAR CHA = 0
VAR WIT = 0

VAR took_goblin_coins = false

You come across a goblin in the woods. What do you do?
+ [Fight it] -> fight
+ [Persuade it to surrender] -> persuade
+ [Surrender] -> surrender

=== fight ===
~ temp roll = RANDOM(1,100)
{ roll <= STR:
    You win.
  - else:
    You lose and limp away.
}
-> after_goblin

=== persuade ===
~ temp roll = RANDOM(1,100)
{roll <= CHA:
  It surrenders. -> after_goblin
- else:
  It laughs and attacks. -> fight
}

=== surrender ===
You drop your weapon. The goblin takes your coins and leaves.
-> after_goblin

=== after_goblin ===
You loot the goblin’s corpse.

+ {not took_goblin_coins} [Take 5 coins]
  ~ coins += 5
  ~ took_goblin_coins = true
  You pocket the coins.
  -> after_goblin

+ [Move on]
  You continue down the trail...
  -> END
