#PUPSI

Still aplha and in active development. It should not used in production!


#What is pupsi?

Pupsi provides single API points for fetching and setting data. It is designed to be used for SQL.


#What is the problem pupsi solves?

Let's take this typical backend-frontend talk between developers.

Frontend: Hey bro, could you provide some data?

Backend: Yes, sure.

...

Backend: Finished.

...

Frontend: Okay nice, could youe please add some fields. I need it here. Ah and please add the related object xy. Please nest it.

Backend: Uhm.. okay.


Now, the backend gives full control of what the frontend can fetch.

Let's take a typical user table. A user can have images and every image could have comments.

With a normal API you could fetch the user. Then the images and of course the comments of the images. BUT, if you use SQL, thats not
efficient. So the backend would provide a specific API point to fetch all data together. That costs time and every time the frontend needs a change, the backend has to adapt.

NOW, imagine the frontend could just send this:

```javascript
{
  "user": {
    "fields": ["username"],
    "condition": { "id": 1 },
    "join": {
        "images": {
        "fields": ["url", "views"],
        "type": "left",
        "join": {
          "images_comments": {
            "type": "left"
          }
        }
      }
    }
  }
}
```

Pupsi takes this object, creates a SQL query and returns nested data to the frontend. Efficiently.

The frontend can easily define, which fields should be fetched AND which related data should be fetched.


#But what has the backend to do then?

The backend, of course, takes care of database design and providing a schema to pupsi.
This schema defines which tables can be joined.
Database design and the Pupsi Schema are not related. You do this seperately, so you have the freedom on both sides.

AND, important: The backend has to take care about security.
