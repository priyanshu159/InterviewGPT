def validate_question(question):

    if question["type"] == "mcq":

        if len(question["options"]) != 4:
            raise Exception("Invalid options")

        if len(set(question["options"])) != 4:
            raise Exception("Duplicate options")

        if question["correct_answer"] not in question["options"]:
            raise Exception("Wrong answer")

        if question["correct_answer"] == "":
            raise Exception("Empty answer")

        if question["explanation"] == "":
            raise Exception("Empty explanation")
        
    # Theory validation
    if question["type"] == "theory":

        if question["options"] != []:
            raise Exception("Theory question should not have options")

        if question["correct_answer"] != "":
            raise Exception("Theory question should not have a correct answer")

        if question["explanation"] == "":
            raise Exception("Explanation is required")