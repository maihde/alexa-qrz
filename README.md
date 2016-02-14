Overview
====================================
A simple Alexa skill that uses the FCC database to lookup information for radio
callsigns.

"Q.R.Z." is a old radio telegraphy code that was used to ask "Who is calling me?"

This project is not affliated with www.qrz.com.

Icons
====================================
Public Domain from [https://thenounproject.com/term/radio-tower/236682/]

About the Interaction Model
====================================
While building this app, I encountered various restrictions with the Alexa
voice model.

Originally I wanted a very simple voice model

```json
{
  "intents": [
    {
      "intent": "GetQRZ",
      "slots": [
        {
          "name": "CallSign",
          "type": "AMAZON.LITERAL"
        },
      ],
    }
  ]
}
```

```
GetQRZ who is {CallSign}
```

But that is invalid syntax, because the literal needs to include the possible values, for example:  

```
GetQRZ who is {ABC123|CallSign}
```

This is obviously a non-starter.  So I defined a custom-type called ```LETTER_OR_NUMBER```, the only
odd thing here is that is requires that numbers be written as words (i.e. "one" instead of "1")

```
A
B
C
...
X
Y
Z
zero
one
two
```

Then I went back and changed the intent:

```json
{
  "intents": [
        {
          "name": "CallSign1",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSign2",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSign3",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSign4",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSign5",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSign6",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSign7",
          "type": "LETTER_OR_NUMBER"
        }
      ]
    }
  ]
}
```

And it turns out that numbers cannot be used in slot names.  So that is why the slots are named A-G.

```json
{
  "intents": [
        {
          "name": "CallSignA",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSignB",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSignC",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSignD",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSignE",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSignF",
          "type": "LETTER_OR_NUMBER"
        },
        {
          "name": "CallSignG",
          "type": "LETTER_OR_NUMBER"
        }
      ]
    }
  ]
}
```
