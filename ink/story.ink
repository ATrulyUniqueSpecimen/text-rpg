VAR coins = 0
VAR inv_rusty_sword = false
VAR inv_old_sack= false

VAR STR = 0
VAR CHA = 0
VAR WIT = 0

VAR took_coins = false
VAR took_sword = false
VAR took_sack = false



You come across a goblin in the woods. What do you do?
+ [Fight it] -> attack
+ [Persuade it to surrender] -> persuade
+ [Surrender] -> surrender

=== attack ===
+ [Attack!] -> fight_goblin

=== fight_goblin ===
~ temp roll = RANDOM(1,10)
{ roll <= STR:
    You win.
    + [Loot the body] -> loot_goblin
    + [Leave] -> after_goblin
  - else:
    You lose and limp away.
}
-> after_goblin

=== loot_goblin ===
You loot the goblin’s corpse.
+ {not took_coins} [Take 5 coins]
~ coins += 5
~ took_coins = true
You pocket the coins.
-> loot_goblin
+ {not took_sword} [Take rusty sword]
~ inv_rusty_sword = true
~ took_sword = true
You grab the sword and put it away.
-> loot_goblin
+ {not took_sack} [Take old sack]
~ inv_old_sack = true
~ took_sack = true
You pick up the sack and put it away.
-> loot_goblin
+ [Leave] -> after_goblin

=== persuade ===
~ temp roll = RANDOM(1,10)
{roll <= CHA:
  It surrenders. -> after_goblin
- else:
  It laughs and attacks. -> attack
}

=== surrender ===
You drop your weapon. The goblin takes your coins and leaves.
-> after_goblin

=== after_goblin ===
+ [Move on]
  You continue down the trail...
  -> END
