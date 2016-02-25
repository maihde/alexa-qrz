#!/usr/bin/env

prefixes = ["", "lookup", "look up", "who is", "who has", "tell me who", "give me the name of", ("who", "is"), ("tell me who", "is")]
bodies = [
    "{CallSignA} {CallSignB} {CallSignC}",
    "{CallSignA} {CallSignB} {CallSignC} {CallSignD}",
    "{CallSignA} {CallSignB} {CallSignC} {CallSignD} {CallSignE}",
    "{CallSignA} {CallSignB} {CallSignC} {CallSignD} {CallSignE} {CallSignF}",
]
suffixes = ["", "please", "stop", "over"]

for prefix in prefixes:
    for body in bodies:
	for suffix in suffixes:
    	    if type(prefix) == tuple:
		print ("GetQRZ " + prefix[0] + " " + body + " " + prefix[1] + " " + suffix).strip()
	    else:
		print ("GetQRZ " + prefix + " " + body + " " + suffix).strip()
    print '\n'
