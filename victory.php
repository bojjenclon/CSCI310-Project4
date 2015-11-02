<!doctype html>
<html class="no-js" lang="en">

  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>Stud of the Spuds</title>

    <link rel="stylesheet" href="css/foundation.css" />
    <script src="js/vendor/modernizr.js"></script>

    <link rel="stylesheet" type="text/css" href="main.css" />
  </head>

  <body>

    <div class="row">

      <div class="small-12 columns text-center">
        <h1>
          <?php
            $score = isset($_GET['score']) ? $_GET['score'] : 0;
            $insult = $score <= 315;

            if ($score < 300) {
              echo "How did you even get here?";
            }
            else if ($score <= 315) {
              echo "Bare Minimum";
            }
            else if ($score <= 400) {
              echo "Spud Slinger";
            }
            else if ($score < 480) {
              echo "Pretty Darn Spudly";
            }
            else if ($score >= 480) {
              echo "The Spudliest of Studs";
            }
          ?>
        </h1>
      </div>

    </div>

    <div class="row">

      <div class="small-12 columns">

        <div class="panel">

          <h3>Congrats, you won! <?php if ($insult) echo "Somehow..."; ?></h3>

          <p>
            Good job, you beat every wave. You conquered every tuber throwing foe. You shot their weak spuds clean out of the air. Now you can leave. What, you wanted some kind of reward or something? Well too bad, the throne's under repairs. Come back in like a month or something, maybe you can have it then. Go on, get out of here! Sheesh, no respect for the Potato Arena...
          </p>

        </div>

      </div>

    </div>

    <script src="js/vendor/jquery.js"></script>
    <script src="js/foundation.min.js"></script>
    <script>
    $(document).foundation();

    </script>
  </body>

</html>

