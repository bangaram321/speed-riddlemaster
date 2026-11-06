/*
 * Speed Riddlemaster — narrator copy pools (PRD §5)
 * Entries are plain strings or { skill: 'LOGIC', text: '…' }.
 * {n} is replaced with a number where relevant.
 * Rule: laugh WITH the player, never at them.
 */
(function (root) {
  var C = {
    praise: [
      'Good work, Detective. The case bends to your will.',
      'Elementary! (We’ll deny we said that.)',
      'Brilliant. Somewhere, a magnifying glass is blushing.',
      { skill: 'LOGIC', text: 'Obviously. Was there ever any doubt?' },
      { skill: 'INLAND EMPIRE', text: 'Your necktie whispers: well done.' },
      'That’s the sound of a mystery being solved. Also, applause. Imaginary applause.',
      'Superb deduction. Scotland Yard is taking notes, in crayon.',
      { skill: 'AUTHORITY', text: 'Stand tall. You’ve earned it.' },
      'Another one bites the dust! The riddle, not you. You’re fine.',
      'Sherlock would be jealous. Watson would be asleep.',
      'Case file stamped: SOLVED. Pip pip!',
      { skill: 'ESPRIT DE CORPS', text: 'The whole city is rooting for you. Even the pigeons.' },
      'You absolute gumshoe. Keep going.',
      'Marvellous! Your hat grows two sizes.',
      { skill: 'ENCYCLOPEDIA', text: 'Fun fact: you are very good at this.' },
      'Good job, Detective! Have a biscuit. (Metaphorical biscuit.)'
    ],
    fast: [
      'Quick as a pickpocket in a rainstorm!',
      'Faster than a hansom cab going downhill. Impressive.',
      'Blink and you’d miss it. The riddle blinked. It lost.'
    ],
    streak: [
      '{n} in a row! The Yard is taking notes.',
      'A streak of {n}! Somebody alert the newspapers.',
      '{n} correct on the trot. The fog parts before you.'
    ],
    forgiven: [
      'Close enough, Detective. We’ll forgive the handwriting.',
      'A spelling of questionable quality, but the intent was spotless.',
      'Typo detected. Typo pardoned. Carry on.'
    ],
    wrong: [
      'Not quite. The trail goes cold, Detective.',
      { skill: 'HALF-LIGHT', text: 'It was the butler. It’s always the butler.' },
      { skill: 'AUTHORITY', text: 'Pull yourself together, Detective.' },
      'Ah. A bold guess. Wrong, but bold.',
      'Even Holmes missed one. Probably. We weren’t there.',
      { skill: 'VOLITION', text: 'You will recover. You always do.' },
      'Wrong! But look on the bright side: you look great in that hat.',
      { skill: 'LOGIC', text: 'That does not follow. But we admire the effort.' },
      'Incorrect. The culprit smirks in the shadows.',
      'So close! (We’re being generous. It wasn’t close.)'
    ],
    timeout: [
      'Time’s up. The culprit slips out the back door.',
      'Tick, tock… and the trail evaporates like pipe smoke.',
      { skill: 'COMPOSURE', text: 'Breathe. The clock was simply being rude.' },
      'The clock wins this round. It was very smug about it.',
      'Too slow, Detective. Even the tortoise has an alibi.'
    ],
    resurrect: [
      'A passing stranger has kindly put you back together. Briefly dead, fully dusted.',
      'Resurrected! Your hat, regrettably, did not make it.',
      'Death attempted. Death was unimpressed. Back to work.',
      'You shuffled off this mortal coil, then shuffled right back. Rude to leave mid-case.',
      'A spooky voice says, “Not yet, Detective.” It also says, “Wear a scarf.”',
      'It happens to the best of us, usually on Tuesdays.',
      'The afterlife was full. Back you go.',
      'Resurrected! Mild confusion included at no extra charge.'
    ],
    lose: [
      'The case remains unsolved. The fog, however, is delighted.',
      'The culprit is still out there. So is your pride. Go and fetch it.',
      'Found at the scene, hat in hand, riddles unsolved. It happens to everyone.',
      'Don’t worry: the Yard has already forgotten. (They haven’t. But they’ll be kind.)'
    ],
    win: [
      'The city sleeps safely tonight. Please accept this imaginary medal.',
      'Every culprit in London has been rounded up, or at least embarrassed.',
      { skill: 'ESPRIT DE CORPS', text: 'We are, frankly, in awe. Take a bow.' },
      'Magnificent. Not even the butler saw that coming.'
    ],
    ranks: [
      'Lost Umbrella Carrier',
      'Pavement Pounder',
      'Junior Gumshoe',
      'Inspector',
      'Chief Inspector',
      'Riddlemaster'
    ],
    ranksSub: [
      'Your umbrella, notably, is missing.',
      'Many pavements were pounded. Few answers were found.',
      'A promising start. The coat is nearly the right size.',
      'You have the badge, the moustache and the nerve.',
      'Lestrade sends his regards (and some paperwork).',
      'Consulting detectives bow before you.'
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  else root.COPY = C;
})(typeof window !== 'undefined' ? window : this);
